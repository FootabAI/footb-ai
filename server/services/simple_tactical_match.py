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
        seed: int = None
    ):
        self.home_team = home_team
        self.away_team = away_team
        self.home_tactic = home_tactic
        self.away_tactic = away_tactic
        
        # Calculate tactical fit scores and effects
        calculator = TacticalFitCalculator()
        self.home_tfs = calculator.calculate_tactical_fit(home_attributes, home_tactic)
        self.away_tfs = calculator.calculate_tactical_fit(away_attributes, away_tactic)
        self.home_effects, self.away_effects = calculator.calculate_match_effects(
            self.home_tfs, self.away_tfs, home_tactic, away_tactic
        )
        
        # Initialize RNG
        self._rng = random.Random(seed)
        
        # Match state
        self._current_score = {"home": 0, "away": 0}
        self._events = []

    async def stream_match(self) -> AsyncGenerator[str, None]:
        """Stream the match events."""
        # Generate all events
        self._generate_match_events()
        
        # Stream events with minute updates
        current_minute = 0
        current_score = {"home": 0, "away": 0}
        
        # Print match setup information with better formatting
        print("\n" + "="*60)
        print(f"MATCH SETUP".center(60))
        print("="*60)
        print(f"{self.home_team} ({self.home_tactic}) vs {self.away_team} ({self.away_tactic})".center(60))
        
        print("\n" + "-"*60)
        print(f"TACTICAL FIT SCORES".center(60))
        print("-"*60)
        print(f"{self.home_team}: {self.home_tfs:.2f}".center(60))
        print(f"{self.away_team}: {self.away_tfs:.2f}".center(60))
        
        print("\n" + "-"*60)
        print(f"MATCH EFFECTS".center(60))
        print("-"*60)
        
        # Home team effects
        print(f"\n{self.home_team}:")
        print("  Tactical Effects:")
        print(f"    Positive Effect: {self.home_effects['positive_effect']:.2f}")
        print(f"    Negative Effect: {self.home_effects['negative_effect']:.2f}")
        print(f"    Penalty: {self.home_effects['penalty']:.2f}")
        print("  Statistics:")
        print(f"    Shots: {self.home_effects['shots']:.1f}")
        print(f"    Shots on Target: {self.home_effects['target']:.1f}")
        print(f"    Corners: {self.home_effects['corners']:.1f}")
        print(f"    Fouls: {self.home_effects['fouls']:.1f}")
        print(f"  Goal Probability per Minute: {self.home_effects['goal_probability']:.3f}")
        
        # Away team effects
        print(f"\n{self.away_team}:")
        print("  Tactical Effects:")
        print(f"    Positive Effect: {self.away_effects['positive_effect']:.2f}")
        print(f"    Negative Effect: {self.away_effects['negative_effect']:.2f}")
        print(f"    Penalty: {self.away_effects['penalty']:.2f}")
        print("  Statistics:")
        print(f"    Shots: {self.away_effects['shots']:.1f}")
        print(f"    Shots on Target: {self.away_effects['target']:.1f}")
        print(f"    Corners: {self.away_effects['corners']:.1f}")
        print(f"    Fouls: {self.away_effects['fouls']:.1f}")
        print(f"  Goal Probability per Minute: {self.away_effects['goal_probability']:.3f}")
        
        print("\n" + "="*60)
        print(f"MATCH EVENTS".center(60))
        print("="*60)
        
        for ev in self._events:
            # Stream minutes up to the next event
            while current_minute < ev["minute"]:
                current_minute += 1
                minute_update = {
                    "type": "minute_update",
                    "minute": current_minute,
                    "score": current_score.copy()
                }
                yield json.dumps(minute_update) + "\n"
                await asyncio.sleep(0.5)
            
            # Update score if it's a goal
            if ev["event"]["type"] == "goal":
                team = ev["event"]["team"]
                current_score[team] += 1
            
            # Stream the actual event
            ev["score"] = current_score.copy()
            yield json.dumps(ev) + "\n"
            await asyncio.sleep(1.0)

    def _generate_match_events(self) -> None:
        """Generate all match events based on tactical effects."""
        events = []
        
        # Generate events for each minute using pre-calculated probabilities
        for minute in range(1, 91):
            # Check for goals based on pre-calculated probabilities
            if self._rng.random() < self.home_effects["goal_probability"]:
                events.append(self._create_event(minute, "home", "goal"))
            if self._rng.random() < self.away_effects["goal_probability"]:
                events.append(self._create_event(minute, "away", "goal"))
        
        # Add match markers
        events.extend([
            self._create_event(45, "info", "half-time"),
            self._create_event(90, "info", "full-time")
        ])
        
        # Sort events by minute
        events.sort(key=lambda e: e["minute"])
        
        # Update scores
        for ev in events:
            if ev["event"]["type"] == "goal":
                team = ev["event"]["team"]
                self._current_score[team] += 1
            ev["score"] = self._current_score.copy()
        
        self._events = events

    def _create_event(self, minute: int, team: str, event_type: str) -> Dict[str, Any]:
        """Create an event dictionary."""
        return {
            "type": "event",
            "minute": minute,
            "event": {
                "team": team,
                "type": event_type,
                "description": self._get_event_description(team, event_type)
            },
            "score": self._current_score.copy()
        }

    def _get_event_description(self, team: str, event_type: str) -> str:
        """Get description for an event."""
        team_name = self.home_team if team == "home" else self.away_team
        
        descriptions = {
            "goal": f"GOAL! {team_name} have scored!",
            "half-time": "Half-time whistle blown.",
            "full-time": "Full-time whistle blown."
        }
        
        return descriptions.get(event_type, "") 
      
      
if __name__ == "__main__":
    # Test Case 1: High TFS (≥ 0.80) for home team
    # print("\nTest Case 1: High TFS (≥ 0.80) for home team")
    # match1 = SimpleTacticalMatch(
    #     home_team="Barcelona",
    #     away_team="Chelsea",
    #     home_attributes={"passing": 90, "dribbling": 75, "pace": 60},  # Perfect for Tiki-Taka
    #     away_attributes={"defending": 90, "physicality": 80, "passing": 45},  # Perfect for Park-the-Bus
    #     home_tactic="tiki-taka",
    #     away_tactic="park-the-bus"
    # )
    

    # Test Case 2: Medium TFS (0.50-0.79) for both teams
    # print("\nTest Case 2: Medium TFS (0.50-0.79) for both teams")
    match2 = SimpleTacticalMatch(
        home_team="Arsenal",
        away_team="Liverpool",
        home_attributes={"passing": 75, "dribbling": 70, "pace": 65},  # Decent for Tiki-Taka
        away_attributes={"pace": 75, "defending": 70, "physicality": 70},  # Decent for Gegenpressing
        home_tactic="tiki-taka",
        away_tactic="gegenpressing"
    )

    # Test Case 3: Low TFS (< 0.40) for away team
    # print("\nTest Case 3: Low TFS (< 0.40) for away team")
    # match3 = SimpleTacticalMatch(
    #     home_team="Manchester City",
    #     away_team="Burnley",
    #     home_attributes={"passing": 85, "dribbling": 80, "pace": 80},  # Good for Total Football
    #     away_attributes={"physicality": 40, "shooting": 35, "pace": 30},  # Poor for Direct Play
    #     home_tactic="total-football",
    #     away_tactic="direct-play"
    # )

    # Run all test cases
    async def run_all_matches():
        for i, match in enumerate([match2], 1):
            
            async for event in match.stream_match():
                event_data = json.loads(event)
                if event_data["type"] == "minute_update":
                    print(f"Minute {event_data['minute']}: {event_data['score']['home']}-{event_data['score']['away']}")
                else:  # event
                    print(f"Minute {event_data['minute']}: {event_data['event']['description']}")
            
            

    # Run the async function
    asyncio.run(run_all_matches())