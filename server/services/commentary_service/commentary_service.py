from collections import deque
from typing import Dict, List, Optional, Any
import json
import asyncio
from dataclasses import dataclass
from datetime import datetime
from openai import OpenAI
import os
from dotenv import load_dotenv
from elevenlabs import VoiceSettings
from elevenlabs.client import ElevenLabs
import uuid
from pathlib import Path

# Load environment variables
load_dotenv()


# Init OpenAI client and ElevenLabs client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
elevenlabs_client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))


# Create temp_audio directory if it doesn't exist
temp_audio_dir = Path("./temp_audio")
temp_audio_dir.mkdir(exist_ok=True)

@dataclass
class MatchContext:
    """Context information for the match."""
    home_team: str
    away_team: str
    home_tactic: str
    away_tactic: str
    current_score: Dict[str, int]
    current_stats: Dict[str, Dict[str, int]]
    minute: int
    half: int = 1

@dataclass
class EventContext:
    """Context for a single event."""
    event_type: str
    team: str
    minute: int
    score: Dict[str, int]
    stats: Dict[str, Dict[str, int]]

class CommentaryService:
    def __init__(self, window_size: int = 5, use_llm: bool = True, use_tts: bool = True):
        """Initialize the commentary service with a sliding context window."""
        
        print("\n=== Initializing CommentaryService ===")
        print(f"Window size: {window_size}")
        print(f"Use LLM: {use_llm}")
        print(f"Use TTS: {use_tts}")
        self.window_size = window_size
        self.context_window = deque(maxlen=window_size)
        self.match_context: Optional[MatchContext] = None
        self._commentary_cache = {}  # Cache for generated commentary
        self._voice_id = "U7dUxWHOyXQdhm6SPVhy"  # Custom commentator voice ID
        self.use_llm = use_llm
        self.use_tts = use_tts
        
    def _generate_audio(self, text: str) -> str:
        """Generate audio file for commentary using ElevenLabs.
        
        Args:
            text: The commentary text to convert to speech
            
        Returns:
            Path to the generated audio file
        """
        try:
            print(f"\nGenerating audio for: {text}")
            response = elevenlabs_client.text_to_speech.convert(
                voice_id=self._voice_id,
                output_format="mp3_44100_128",  # Changed to a more widely supported format
                text=text,
                model_id="eleven_turbo_v2_5",
                voice_settings=VoiceSettings(
                    stability=0.05,  # expressiveness
                    similarity_boost=0.2,  # Lower for more dramatic variation
                    style=0.99,  # Maximum style for dramatic delivery
                    use_speaker_boost=True,
                    speed=1.2  # Maximum allowed speed for excitement
                ),
            )

            # Generate a unique file name for the output MP3 file
            audio_filename = f"{uuid.uuid4()}.mp3"
            audio_path = temp_audio_dir / audio_filename

            # Writing the audio to a file
            with open(audio_path, "wb") as f:
                for chunk in response:
                    if chunk:
                        f.write(chunk)

            print(f"Generated audio file: {audio_filename}")
            return f"/audio/{audio_filename}"  # Return the URL path for the audio file
            
        except Exception as e:
            print(f"Error generating audio: {str(e)}")
            return None

    def set_match_context(self, context: MatchContext):
        """Set the current match context."""
        print("\n=== Setting Match Context ===")
        print(f"Home Team: {context.home_team} ({context.home_tactic})")
        print(f"Away Team: {context.away_team} ({context.away_tactic})")
        print(f"Current Score: {context.current_score}")
        print(f"Current Stats: {json.dumps(context.current_stats, indent=2)}")
        print(f"Minute: {context.minute}, Half: {context.half}")
        self.match_context = context
        
    def add_events(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Add multiple events to the context window and generate commentary in batch.
        
        Args:
            events: List of event dictionaries containing event details
            
        Returns:
            List of events with generated commentary
        """
        if not self.match_context:
            raise ValueError("Match context not set")
            
        print(f"\n=== Processing Batch of {len(events)} Events ===")
        
        # Create event contexts for all events
        event_contexts = []
        for event in events:
            if event["type"] != "event":  # Skip non-event updates
                continue
                
            print(f"Event at {event['minute']}': {event['event']['type']} for {event['event']['team']}")
            
            # Only generate audio for significant events
            event_type = event["event"]["type"]
            should_generate_audio = event_type in [
                "goal",  # Goals are always significant
                "red_card",  # Red cards are always significant
                "yellow_card",  # Yellow cards are significant
                "half-time",  # Half time is significant
                "full-time"  # Full time is significant
            ]
            
            event_context = EventContext(
                event_type=event["event"]["type"],
                team=event["event"]["team"],
                minute=event["minute"],
                score=event["score"],
                stats=event["stats"]
            )
            event_contexts.append((event, event_context, should_generate_audio))
            
            # Add to context window
            self.context_window.append(event_context)
            
        # Generate commentary for all events in batch
        if event_contexts:
            print("\nGenerating batch commentary...")
            
            if self.use_llm:
                commentaries = self._generate_batch_commentary([ec for _, ec, _ in event_contexts])
            else:
                # Use default commentary if LLM is disabled
                commentaries = [self._get_default_commentary(ec) for _, ec, _ in event_contexts]
            
            # Update events with generated commentary and audio
            for (event, _, should_generate_audio), (formal, narrative) in zip(event_contexts, commentaries):
                event["event"]["event_description"] = formal
                # Only generate audio for significant events if TTS is enabled
                if should_generate_audio and self.use_tts:
                    audio_url = self._generate_audio(narrative)
                    event["event"]["audio_url"] = audio_url
                else:
                    event["event"]["audio_url"] = None
                
        return events
        
    def _generate_batch_commentary(self, event_contexts: List[EventContext]) -> List[tuple[str, str]]:
        """Generate both formal and narrative commentary for multiple events using OpenAI API.
        
        Args:
            event_contexts: List of contexts for the current events
            
        Returns:
            List of tuples containing (formal_commentary, narrative_commentary) for each event
        """
        # Create cache keys for all events
        cache_keys = [f"{ec.event_type}_{ec.team}_{ec.minute}" for ec in event_contexts]
        
        # Check cache for each event
        commentaries = []
        uncached_indices = []
        for i, key in enumerate(cache_keys):
            if key in self._commentary_cache:
                commentaries.append(self._commentary_cache[key])
            else:
                commentaries.append(None)
                uncached_indices.append(i)
        
        # If all events are cached, return them
        if not uncached_indices:
            return commentaries
            
        # Build context for the LLM
        context = {
            "events": [
                {
                    "type": ec.event_type,
                    "team": ec.team,
                    "minute": ec.minute,
                    "score": ec.score
                }
                for i, ec in enumerate(event_contexts) if i in uncached_indices
            ],
            "recent_events": [
                {
                    "type": e.event_type,
                    "team": e.team,
                    "minute": e.minute,
                    "score": e.score
                }
                for e in self.context_window
            ],
            "match_context": {
                "home_team": self.match_context.home_team,
                "away_team": self.match_context.away_team,
                "home_tactic": self.match_context.home_tactic,
                "away_tactic": self.match_context.away_tactic,
                "current_score": self.match_context.current_score,
                "current_stats": self.match_context.current_stats,
                "minute": self.match_context.minute,
                "half": self.match_context.half
            }
        }
        
        print("\nSending batch context to OpenAI:")
        print(json.dumps(context, indent=2))

        try:
            print("\nCalling OpenAI API for batch commentary...")
            # Call OpenAI API for both formal and narrative commentary
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": """You are a football commentator generating two types of commentary for match events:

                      1. Formal description (event_description):
                        - Must be concise and factual
                        - Must NOT mention the score or minute
                        - Must use the actual team names (not "home team" or "away team")
                        - Used for UI display
                        Example: "AI United takes a shot, but the goalkeeper saves it" or "Red card shown to AI United player, AI United are down to 10 men"

                      2. Narrative description (audio_url):
                        - Must be engaging and exciting
                        - MUST include the current score
                        - Must use the actual team names
                        - Should acknowledge patterns (e.g., multiple shots in succession)
                        - Should reference the match context (tactics, stats, etc.)
                        - Used for future text-to-speech
                        Example: "Chelsea FC is relentless! Another shot on target! The score remains 1-0 in their favor!"

                      You will receive a list of events. For each event, respond with a JSON object containing 'event_description' and 'audio_url'.
                      Return an array of these JSON objects, one for each event.

                      IMPORTANT:
                      - Always use the actual team names from match_context
                      - Always include the current score in narrative descriptions
                      - Never mention the score in formal descriptions
                      - Keep formal descriptions under 10 words
                      - Make narrative descriptions engaging but under 40 words"""
                                          },
                    {
                        "role": "user",
                        "content": f"Generate commentary for these events with context:\n{json.dumps(context, indent=2)}"
                    }
                ],
                temperature=0.7,
                max_tokens=500
            )

            print("\nReceived response from OpenAI")
            # Parse the response
            batch_commentary = json.loads(response.choices[0].message.content)
            print(f"Parsed response: {json.dumps(batch_commentary, indent=2)}")

            # Update commentaries list with new values
            for i, commentary in zip(uncached_indices, batch_commentary):
                commentaries[i] = (commentary["event_description"], commentary["audio_url"])
                # Cache the commentary
                self._commentary_cache[cache_keys[i]] = commentaries[i]

        except Exception as e:
            print(f"\nError calling OpenAI API: {str(e)}")
            print("Falling back to default commentary")
            # Fallback to default commentary for uncached events
            for i in uncached_indices:
                commentaries[i] = self._get_default_commentary(event_contexts[i])
                # Cache the default commentary
                self._commentary_cache[cache_keys[i]] = commentaries[i]
        
        return commentaries
        
    def _get_default_commentary(self, event_context: EventContext) -> tuple[str, str]:
        """Get default formal and narrative commentary when LLM is not available."""
        print("\n=== Using Default Commentary ===")
        team_name = (self.match_context.home_team 
                    if event_context.team == "home" 
                    else self.match_context.away_team)
                    
        score = f"{event_context.score['home']}-{event_context.score['away']}"
        print(f"Team: {team_name}")
        print(f"Score: {score}")
        
        # Formal descriptions for UI display (without score or minute)
        formal_descriptions = {
            "goal": f"Goal scored by {team_name}",
            "shot": f"Shot taken by {team_name}",
            "target": f"Shot on target by {team_name}",
            "yellow_card": f"Yellow card shown to {team_name} player",
            "red_card": f"Red card shown to {team_name} player",
            "half-time": "Half-time",
            "full-time": "Full-time",
        }
        
        # Narrative descriptions for future TTS (with score and excitement)
        narrative_descriptions = {
            "goal": f"GOOOOOAL! {team_name} have found the back of the net! The score is now {score}! What a moment in this match!",
            "shot": f"Powerful attempt from {team_name}! The goalkeeper is called into action!",
            "target": f"Excellent shot on target by {team_name}! The keeper makes a crucial save!",
            "yellow_card": f"The referee reaches for his pocket! Yellow card shown to {team_name}! That could be crucial in the later stages of the game!",
            "red_card": f"RED CARD! RED CARD! {team_name} are down to 10 men! This could completely change the complexion of the match!",
            "half-time": f"And that's the end of the first half! The score stands at {score}! What a fascinating 45 minutes of football we've witnessed!",
            "full-time": f"FULL TIME! The final whistle blows! The score is {score}! What a match we've just witnessed!",
        }
        
        formal = formal_descriptions.get(event_context.event_type, "")
        narrative = narrative_descriptions.get(event_context.event_type, "")
        print(f"Formal: {formal}")
        print(f"Narrative: {narrative}")
        
        return formal, narrative
        
    def clear_cache(self):
        """Clear the commentary cache."""
        print("\n=== Clearing Commentary Cache ===")
        self._commentary_cache.clear()
        
    def reset(self):
        """Reset the service state."""
        print("\n=== Resetting Commentary Service ===")
        self.context_window.clear()
        self.match_context = None
        self.clear_cache() 
        
if __name__ == "__main__":
    commentary_service = CommentaryService()
    commentary_service.set_match_context(MatchContext(
        home_team="AI United",
        away_team="Chelsea FC",
        home_tactic="3-5-2",
        away_tactic="4-3-3",
        current_score={"home": 0, "away": 0},
        current_stats={
            "home": {"shots": 0, "shotsOnTarget": 0, "yellowCards": 0, "redCards": 0},
            "away": {"shots": 0, "shotsOnTarget": 0, "yellowCards": 0, "redCards": 0}
        },
        minute=0,
        half=1
    ))
    
    events = [
        {
            "type": "goal",
            "team": "home",
            "minute": 10,
            "score": {"home": 1, "away": 0},
            "stats": {"home": {"shots": 1, "shotsOnTarget": 1, "yellowCards": 0, "redCards": 0}, "away": {"shots": 0, "shotsOnTarget": 0, "yellowCards": 0, "redCards": 0}}
        }
    ]
    commentary_service.add_events(events)
    commentary_service._generate_audio("AI United takes a shot, but the goalkeeper saves it")
    