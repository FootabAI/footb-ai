from pydantic import BaseModel
from typing import Optional, Dict

class TeamTactics(BaseModel):
    passAccuracy: int
    shootAccuracy: int
    speed: int
    defense: int
    stamina: int
    totalPoints: int
    remainingPoints: int
    
class Team(BaseModel):
    id: str
    name: str
    logo: str
    strength: int
    ai: bool
    primaryColor: Optional[str] = None
    tactics: Optional[Dict] = None
    pointsBalance: Optional[int] = 0
    tacticalStyle: Optional[str] = "balanced"

class AIAssistedTeamRequest(BaseModel):
    prompt: str
    tactics: Optional[Dict] = None
    teamName: Optional[str] = None
    teamLogo: Optional[str] = None
    themeTags: Optional[list] = None
    colorTags: Optional[list] = None 