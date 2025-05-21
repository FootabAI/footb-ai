from typing import Dict, Any, Optional, AsyncGenerator
import json
import asyncio
from pathlib import Path

class CommentaryService:
    def __init__(self, voice_id: Optional[str] = None):
        """
        Initialize the commentary service.
        
        Args:
            voice_id: Optional voice ID for text-to-speech (will be used later with ElevenLabs)
        """
        self.voice_id = voice_id
        self._current_match_id: Optional[str] = None
        self._active_matches: Dict[str, Dict[str, Any]] = {}

    async def process_event(self, match_id: str, event: Dict[str, Any]) -> str:
        """
        Process a match event and generate commentary text.
        
        Args:
            match_id: Unique identifier for the match
            event: The match event to process
            
        Returns:
            str: Commentary text for the event
        """
        # Store match state if it's a new match
        if match_id not in self._active_matches:
            self._active_matches[match_id] = {
                "score": {"home": 0, "away": 0},
                "home_team": event.get("home_team", "Home Team"),
                "away_team": event.get("away_team", "Away Team")
            }
        
        # Update match state
        if "score" in event:
            self._active_matches[match_id]["score"] = event["score"]
        
        # Generate commentary based on event type
        event_type = event["event"]["type"]
        team = event["event"]["team"]
        minute = event["minute"]
        
        # Get team name from event or stored match data
        team_name = (
            event.get(f"{team}_team") or 
            self._active_matches[match_id].get(f"{team}_team") or 
            f"{team.title()} Team"
        )
        
        # Basic commentary templates
        commentary = {
            "goal": f"GOAL! {team_name} score in the {minute}th minute!",
            "yellow_card": f"Yellow card shown to {team_name}.",
            "red_card": f"RED CARD! {team_name} down to 10 men!",
            "substitution": f"{team_name} make a substitution.",
            "half_time": "The referee blows for half-time.",
            "full_time": "That's it! The match is over."
        }
        
        return commentary.get(event_type, "Something interesting happens...")

    async def stream_commentary(self, match_id: str, event_stream) -> AsyncGenerator[str, None]:
        """
        Stream commentary for a match.
        
        Args:
            match_id: Unique identifier for the match
            event_stream: Async generator of match events
            
        Yields:
            str: Commentary text for each event
        """
        self._current_match_id = match_id
        
        async for event_str in event_stream:
            try:
                # Parse the JSON string into a dictionary
                event = json.loads(event_str)
                
                # Add team names to the event if they're not present
                if match_id in self._active_matches:
                    event["home_team"] = self._active_matches[match_id]["home_team"]
                    event["away_team"] = self._active_matches[match_id]["away_team"]
                
                commentary = await self.process_event(match_id, event)
                yield json.dumps({
                    "commentary": commentary,
                    "event": event
                }) + "\n"
                await asyncio.sleep(1)  # Add a small delay between commentaries
            except Exception as e:
                print(f"Error processing commentary: {e}")
                continue

    def cleanup_match(self, match_id: str):
        """
        Clean up match data when the match is over.
        
        Args:
            match_id: Unique identifier for the match to clean up
        """
        if match_id in self._active_matches:
            del self._active_matches[match_id]
