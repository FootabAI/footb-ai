from pydantic import BaseModel
from typing import List, Optional, Dict
from .team import Team
from dataclasses import dataclass
from datetime import datetime

class MatchEvent(BaseModel):
    minute: int
    type: str
    team: str
    description: str
    player: Optional[str] = None

class MatchStats(BaseModel):
    possession: Dict[str, int]
    shots: Dict[str, Dict[str, int]]
    passes: Dict[str, Dict[str, int]]
    corners: Dict[str, int]
    fouls: Dict[str, int]
    cards: Dict[str, Dict[str, int]]

class MatchSimulationRequest(BaseModel):
    home_team: Team
    away_team: Team
    current_minute: Optional[int] = 0

class MatchSimulationResponse(BaseModel):
    home_score: int
    away_score: int
    events: List[MatchEvent]
    stats: MatchStats 

@dataclass
class MatchStats:
    possession: int
    shots: int
    shots_on_target: int
    passes: int
    pass_accuracy: int
    fouls: int
    yellow_cards: int
    red_cards: int

@dataclass
class MatchEvent:
    id: str
    type: str  # 'goal', 'card', 'substitution', 'injury', etc.
    minute: int
    team_id: str
    description: str

@dataclass
class Match:
    id: str
    home_team_id: str
    away_team_id: str
    home_score: int
    away_score: int
    home_stats: MatchStats
    away_stats: MatchStats
    events: List[MatchEvent]
    is_completed: bool
    created_at: datetime
    updated_at: datetime
    winner_id: Optional[str] = None

    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'home_team_id': self.home_team_id,
            'away_team_id': self.away_team_id,
            'home_score': self.home_score,
            'away_score': self.away_score,
            'home_stats': {
                'possession': self.home_stats.possession,
                'shots': self.home_stats.shots,
                'shots_on_target': self.home_stats.shots_on_target,
                'passes': self.home_stats.passes,
                'pass_accuracy': self.home_stats.pass_accuracy,
                'fouls': self.home_stats.fouls,
                'yellow_cards': self.home_stats.yellow_cards,
                'red_cards': self.home_stats.red_cards,
            },
            'away_stats': {
                'possession': self.away_stats.possession,
                'shots': self.away_stats.shots,
                'shots_on_target': self.away_stats.shots_on_target,
                'passes': self.away_stats.passes,
                'pass_accuracy': self.away_stats.pass_accuracy,
                'fouls': self.away_stats.fouls,
                'yellow_cards': self.away_stats.yellow_cards,
                'red_cards': self.away_stats.red_cards,
            },
            'events': [{
                'id': event.id,
                'type': event.type,
                'minute': event.minute,
                'team_id': event.team_id,
                'description': event.description
            } for event in self.events],
            'is_completed': self.is_completed,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'winner_id': self.winner_id
        } 