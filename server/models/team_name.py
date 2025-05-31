from pydantic import BaseModel, Field
from typing import Optional
from typing import Dict


class TeamGenerationRequest(BaseModel):
    country: Optional[str] = Field(None, description="e.g. 'Spain', 'Norway'")
    theme: Optional[str] = Field(None, description="Optional creative theme, like 'mythical creatures'")



class TeamGenerationResponse(BaseModel):
    team: Dict[str, str] 
    success: bool = True