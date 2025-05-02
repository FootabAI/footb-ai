import asyncio
import json
from typing import List, Dict, Any, Generator
from ..models.match import MatchEvent, MatchStats
from ..models.team import Team

class MatchService:
    def __init__(self):
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

    async def generate_match_events(
        self,
        home_team: Team,
        away_team: Team,
        current_minute: int = 0
    ) -> Generator[str, None, None]:
        events = []
        home_score = 0
        away_score = 0
        
        stats = MatchStats(
            possession={"home": 50, "away": 50},
            shots={"home": {"total": 0, "onTarget": 0}, "away": {"total": 0, "onTarget": 0}},
            passes={"home": {"total": 0, "completed": 0}, "away": {"total": 0, "completed": 0}},
            corners={"home": 0, "away": 0},
            fouls={"home": 0, "away": 0},
            cards={"home": {"yellow": 0, "red": 0}, "away": {"yellow": 0, "red": 0}}
        )
        
        for minute, team, event_type, description in self.match_events:
            if minute <= current_minute:
                continue
                
            if event_type == "goal":
                if team == "home":
                    home_score += 1
                else:
                    away_score += 1
                stats.shots[team]["onTarget"] += 1
            elif event_type == "yellow_card":
                stats.cards[team]["yellow"] += 1
            elif event_type == "red_card":
                stats.cards[team]["red"] += 1
            elif event_type == "corner":
                stats.corners[team] += 1
            elif event_type == "foul":
                stats.fouls[team] += 1
            
            event = MatchEvent(
                minute=minute,
                type=event_type,
                team=team,
                description=description
            )
            
            events.append(event)
            yield json.dumps({
                "minute": minute,
                "event": event.dict(),
                "score": {"home": home_score, "away": away_score},
                "stats": stats.dict()
            }) + "\n"
            
            if event_type == "half-time" and current_minute < 45:
                break
                
            await asyncio.sleep(0.5) 