from pydantic import BaseModel, Field
from typing import List, Optional, Dict

class PlayerGenerationRequest(BaseModel):
    nationality: Optional[str] = Field(None, description="e.g. 'Spanish', 'Norwegian'")
    theme:       Optional[str] = Field(None, description="Extra flavour such as 'Viking legends'")
    with_positions: bool       = Field(True,  description="Return positions with the names")

class PlayerGenerationResponse(BaseModel):
    squad:  List[Dict[str, str]]
    names:  List[str]
    success: bool = True