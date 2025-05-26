"""
Simple tactical match simulator based on tactical fit scores.
"""

import asyncio
import json
import random
from typing import Dict, Any, AsyncGenerator
from pathlib import Path

# Fix import to work both as module and when run directly
try:
    from .tactical_fit_calculator import TacticalFitCalculator
except ImportError:
    from tactical_fit_calculator import TacticalFitCalculator

class SimpleTacticalMatch:
    def __init__(
        self,
        home_team: str,
        away_team: str,
        home_attributes: Dict[str, int],
        away_attributes: Dict[str, int],
        home_tactic: str,
        away_tactic: str,
        *,
        seed: int = None,
        match_length: int = 120,  # Total match length in seconds
        time_scale: float = 1  # Time scaling factor (1.0 = real-time)
    ):
        self.home_team = home_team
        self.away_team = away_team
        self.home_tactic = home_tactic
        self.away_tactic = away_tactic
        self.home_attributes = home_attributes
        self.away_attributes = away_attributes
        
        # Match timing settings
        self.match_length = match_length
        self.time_scale = time_scale
        self.half_length = match_length // 2  # Each half is exactly half of total length
        
        # Calculate tactical fit scores and effects
        calculator = TacticalFitCalculator()
        self.home_tfs = calculator.calculate_tactical_fit(home_attributes, home_tactic)
        self.away_tfs = calculator.calculate_tactical_fit(away_attributes, away_tactic)
        self.home_effects, self.away_effects = calculator.calculate_match_effects(
            self.home_tfs, self.away_tfs, home_tactic, away_tactic
        )
        
        # Print match setup information
        print("\n=== Match Setup ===")
        print(f"Home Team: {home_team}")
        print(f"Away Team: {away_team}")
        print(f"Match Length: {match_length} seconds")
        print(f"Half Length: {self.half_length} seconds")
        print(f"Time Scale: {time_scale}x")
        print(f"\nHome Team Attributes:")
        for attr, value in home_attributes.items():
            print(f"- {attr}: {value}")
        print(f"\nAway Team Attributes:")
        for attr, value in away_attributes.items():
            print(f"- {attr}: {value}")
        print(f"\nTactics:")
        print(f"- Home: {home_tactic}")
        print(f"- Away: {away_tactic}")
        print(f"\nTactical Fit Scores:")
        print(f"- Home TFS: {self.home_tfs:.2f}")
        print(f"- Away TFS: {self.away_tfs:.2f}")
        print(f"\nMatch Effects:")
        print("Home Team Effects:")
        for effect, value in self.home_effects.items():
            print(f"- {effect}: {value:.2f}")
        print("\nAway Team Effects:")
        for effect, value in self.away_effects.items():
            print(f"- {effect}: {value:.2f}")
        print("==================\n")
        
        # Initialize RNG
        self._rng = random.Random(seed)
        
        # Match state
        self._current_score = {"home": 0, "away": 0}
        self._events = []
        self._first_half_events = []
        self._second_half_events = []

    def update_tactic(self, team: str, new_tactic: str) -> Dict[str, Any]:
        """Update tactic for a team and recalculate effects."""
        if team == "home":
            self.home_tactic = new_tactic
            self.home_tfs = TacticalFitCalculator().calculate_tactical_fit(self.home_attributes, new_tactic)
        else:
            self.away_tactic = new_tactic
            self.away_tfs = TacticalFitCalculator().calculate_tactical_fit(self.away_attributes, new_tactic)
        
        # Recalculate match effects
        calculator = TacticalFitCalculator()
        self.home_effects, self.away_effects = calculator.calculate_match_effects(
            self.home_tfs, self.away_tfs, self.home_tactic, self.away_tactic
        )

        # Return updated effects for printing
        return {
            "home_tfs": self.home_tfs,
            "away_tfs": self.away_tfs,
            "home_effects": self.home_effects,
            "away_effects": self.away_effects
        }

    def _scale_minute(self, real_minute: int) -> int:
        """Scale a real match minute to the custom match length."""
        # Convert real minute (1-45) to simulation minutes
        # For a 2-minute match (120 seconds), each half should be 1 minute (60 seconds)
        # So 45 real minutes should map to 45 simulation minutes
        return real_minute

    def _generate_events_for_minute(self, minute: int, is_last_minute: bool = False) -> list:
        """Generate all possible events for a given minute."""
        events = []
        
        # Check for goals
        if self._rng.random() < self.home_effects["goal_probability"]:
            events.append(self._create_event(minute, "home", "goal"))
        if self._rng.random() < self.away_effects["goal_probability"]:
            events.append(self._create_event(minute, "away", "goal"))
        
        # Check for yellow cards
        if self._rng.random() < self.home_effects["yellow_card_probability"]:
            events.append(self._create_event(minute, "home", "yellow_card"))
        if self._rng.random() < self.away_effects["yellow_card_probability"]:
            events.append(self._create_event(minute, "away", "yellow_card"))
        
        # Check for red cards
        if self._rng.random() < self.home_effects["red_card_probability"]:
            events.append(self._create_event(minute, "home", "red_card"))
        if self._rng.random() < self.away_effects["red_card_probability"]:
            events.append(self._create_event(minute, "away", "red_card"))
            
        # Add half-time or full-time event if this is the last minute
        if is_last_minute:
            if minute == 45:
                events.append(self._create_event(minute, "info", "half-time"))
            elif minute == 90:
                events.append(self._create_event(minute, "info", "full-time"))
            
        return events

    def _generate_first_half_events(self) -> None:
        """Generate events for the first half."""
        events = []
        
        # Generate events for first half (1-45 minutes)
        for minute in range(1, 46):
            # Pass is_last_minute=True for minute 45
            events.extend(self._generate_events_for_minute(minute, minute == 45))
        
        # Sort events by minute
        events.sort(key=lambda e: e["minute"])
        self._first_half_events = events

    def _generate_second_half_events(self) -> None:
        """Generate events for the second half."""
        events = []
        
        # Generate events for second half (46-90 minutes)
        for minute in range(46, 91):
            # Pass is_last_minute=True for minute 90
            events.extend(self._generate_events_for_minute(minute, minute == 90))
        
        # Sort events by minute
        events.sort(key=lambda e: e["minute"])
        self._second_half_events = events

    async def stream_first_half(self) -> AsyncGenerator[str, None]:
        """Stream the first half events."""
        # Generate first half events if not already generated
        if not self._first_half_events:
            self._generate_first_half_events()
        
        # Print match setup information
        setup_info = {
            "type": "match_setup",
            "home_team": self.home_team,
            "away_team": self.away_team,
            "home_tactic": self.home_tactic,
            "away_tactic": self.away_tactic,
            "home_tfs": self.home_tfs,
            "away_tfs": self.away_tfs,
            "home_effects": self.home_effects,
            "away_effects": self.away_effects,
            "match_length": self.match_length,
            "time_scale": self.time_scale
        }
        yield json.dumps(setup_info) + "\n"
        
        # Stream first half events
        current_minute = 0
        current_score = {"home": 0, "away": 0}
        
        for ev in self._first_half_events:
            # Stream minutes up to the next event
            while current_minute < ev["minute"]:
                current_minute += 1
                minute_update = {
                    "type": "minute_update",
                    "minute": current_minute,
                    "score": current_score.copy()
                }
                yield json.dumps(minute_update) + "\n"
                # Scale the sleep time based on time_scale
                # For a 2-minute match, each half is 1 minute, so each minute should take 1/45 of that time
                await asyncio.sleep((self.half_length / 45) / self.time_scale)
            
            # Update score if it's a goal
            if ev["event"]["type"] == "goal":
                team = ev["event"]["team"]
                current_score[team] += 1
                self._current_score[team] += 1
            
            # Stream the actual event
            ev["score"] = current_score.copy()
            yield json.dumps(ev) + "\n"

    async def stream_second_half(self) -> AsyncGenerator[str, None]:
        """Stream the second half events."""
        # Generate second half events if not already generated
        if not self._second_half_events:
            self._generate_second_half_events()
        
        # Stream second half events
        current_minute = 45
        current_score = self._current_score.copy()
        
        for ev in self._second_half_events:
            # Stream minutes up to the next event
            while current_minute < ev["minute"]:
                current_minute += 1
                minute_update = {
                    "type": "minute_update",
                    "minute": current_minute,
                    "score": current_score.copy()
                }
                yield json.dumps(minute_update) + "\n"
                # Scale the sleep time based on time_scale
                # For a 2-minute match, each half is 1 minute, so each minute should take 1/45 of that time
                await asyncio.sleep((self.half_length / 45) / self.time_scale)
            
            # Update score if it's a goal
            if ev["event"]["type"] == "goal":
                team = ev["event"]["team"]
                current_score[team] += 1
                self._current_score[team] += 1
            
            # Stream the actual event
            ev["score"] = current_score.copy()
            yield json.dumps(ev) + "\n"

    async def _print_match_setup(self) -> AsyncGenerator[str, None]:
        """Print match setup information."""
        setup_info = {
            "type": "match_setup",
            "home_team": self.home_team,
            "away_team": self.away_team,
            "home_tactic": self.home_tactic,
            "away_tactic": self.away_tactic,
            "home_tfs": self.home_tfs,
            "away_tfs": self.away_tfs,
            "home_effects": self.home_effects,
            "away_effects": self.away_effects
        }
        yield json.dumps(setup_info) + "\n"

    def _create_event(self, minute: int, team: str, event_type: str) -> Dict[str, Any]:
        """Create an event dictionary."""
        return {
            "type": "event",
            "minute": minute,
            "event": {
                "team": team,
                "type": event_type,
                "event_description": self._get_event_description(team, event_type)
            },
            "score": self._current_score.copy()
        }

    def _get_event_description(self, team: str, event_type: str) -> str:
        """Get description for an event."""
        team_name = self.home_team if team == "home" else self.away_team
        
        descriptions = {
            "goal": f"GOAL! {team_name} have scored!",
            "half-time": "Half-time whistle blown.",
            "full-time": "Full-time whistle blown.",
            "yellow_card": f"Yellow card shown to {team_name} player!",
            "red_card": f"RED CARD! {team_name} player has been sent off!"
        }
        
        return descriptions.get(event_type, "")
      
      
if __name__ == "__main__":
    match2 = SimpleTacticalMatch(
        home_team="Arsenal",
        away_team="Liverpool",
        home_attributes={"passing": 75, "dribbling": 70, "pace": 65},  # Decent for Tiki-Taka
        away_attributes={"pace": 75, "defending": 70, "physicality": 70},  # Decent for Gegenpressing
        home_tactic="tiki-taka",
        away_tactic="gegenpressing"
    )

    async def run_all_matches():
        for i, match in enumerate([match2], 1):
            async for event in match.stream_first_half():
                event_data = json.loads(event)
                if event_data["type"] == "minute_update":
                    print(f"Minute {event_data['minute']}: {event_data['score']['home']}-{event_data['score']['away']}")
                elif event_data["type"] == "event":
                    print(f"Minute {event_data['minute']}: {event_data['event']['description']}")
                elif event_data["type"] == "match_setup":
                    print("\nMatch Setup:")
                    print(f"Home: {event_data['home_team']} ({event_data['home_tactic']})")
                    print(f"Away: {event_data['away_team']} ({event_data['away_tactic']})")
                    print(f"Home TFS: {event_data['home_tfs']:.2f}")
                    print(f"Away TFS: {event_data['away_tfs']:.2f}\n")
                    
                    
            async for event in match.stream_second_half():
                event_data = json.loads(event)
                if event_data["type"] == "minute_update":
                    print(f"Minute {event_data['minute']}: {event_data['score']['home']}-{event_data['score']['away']}")
                elif event_data["type"] == "event":
                    print(f"Minute {event_data['minute']}: {event_data['event']['description']}")
            
    # Run the async function
    asyncio.run(run_all_matches())