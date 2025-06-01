from pydantic import BaseModel
from typing import List, Optional

class LogoGenerationRequest(BaseModel):
    themes: List[str]
    colors: List[str]

class SimilarLogo(BaseModel):
    path: str
    similarity: float
    description: str

class LogoGenerationResponse(BaseModel):
    club_name: str
    logo_description: str
    logo_url: str
    similar_logos: List[SimilarLogo]
    success: bool
    error: Optional[str] = None 
    main_color: str