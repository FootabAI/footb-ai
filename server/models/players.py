from pydantic import BaseModel, Field
from typing import List, Optional, Dict

class PlayerGenerationRequest(BaseModel):
    nationality: Optional[str] = Field(None, description="e.g. 'Spanish', 'Norwegian'")
    with_positions: bool       = Field(False, description="Return a position along with the name")

class PlayerGenerationResponse(BaseModel):
    player:  Dict[str, str]  # e.g., {"name": "Erik Thorsen", "position": "Midfielder"}
    success: bool = True