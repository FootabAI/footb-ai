import asyncio
from typing import List, Dict, Any, AsyncGenerator
import json

class MatchService:
    def __init__(self):
        # Hard-coded match events
        self.match_events = [
            (12, "home", "goal", "GOAL! Home team scores!"),
            (23, "away", "yellow_card", "Yellow card for away team."),
            (34, "away", "goal", "GOAL! Away team scores!"),
            (45, "home", "yellow_card", "Yellow card for home team."),
            (45, "info", "half-time", "Half-time break"),
            (47, "away", "substitution", "Substitution for away team."),
            (58, "home", "goal", "GOAL! Home team scores!"),
            (67, "away", "red_card", "RED CARD! Away team is down to 10 men!"),
            (78, "home", "goal", "GOAL! Home team scores!"),
            (85, "away", "yellow_card", "Yellow card for away team."),
            (90, "info", "full-time", "Full-time")
        ]
        self._is_half_time = False
        self._should_continue = False

    async def generate_match_events(self, start_minute: int = 0) -> List[Dict[str, Any]]:
        """Generate match events with scores starting from a specific minute."""
        home_score = 0
        away_score = 0
        events = []

        for minute, team, event_type, description in self.match_events:
            if minute < start_minute:
                # Update score for goals that happened before start_minute
                if event_type == "goal":
                    if team == "home":
                        home_score += 1
                    else:
                        away_score += 1
                continue

            # Update score for goals
            if event_type == "goal":
                if team == "home":
                    home_score += 1
                else:
                    away_score += 1

            # Create event object
            event = {
                "minute": minute,
                "event": {
                    "type": event_type,
                    "team": team,
                    "description": description
                },
                "score": {
                    "home": home_score,
                    "away": away_score
                }
            }
            events.append(event)

        return events

    async def stream_match_events(self) -> AsyncGenerator[str, None]:
        """Stream match events with a delay between each event."""
        events = await self.generate_match_events()
        
        for event in events:
            # Stop at half-time
            if event["event"]["type"] == "half-time":
                self._is_half_time = True
                yield json.dumps(event) + "\n"
                break

            yield json.dumps(event) + "\n"
            await asyncio.sleep(1)  # Wait 1 second between events

    async def continue_second_half(self) -> AsyncGenerator[str, None]:
        """Continue streaming events from after half-time."""
        if not self._is_half_time:
            raise ValueError("Cannot continue second half - not at half-time")
        
        events = await self.generate_match_events(start_minute=46)
        
        for event in events:
            yield json.dumps(event) + "\n"
            await asyncio.sleep(1)  # Wait 1 second between events 