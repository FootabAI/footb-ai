from pydantic import BaseModel
from typing import List, Optional, Dict
from .team import Team

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