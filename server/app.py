from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
import uvicorn
import base64

from models.logo import LogoGenerationRequest, LogoGenerationResponse
from services.logo_service import LogoService
from services.match_service import MatchService

# Load environment variables
load_dotenv()

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
logo_service = LogoService(reference_images_dir="images")
match_service = MatchService()

@app.post("/create_club_logo", response_model=LogoGenerationResponse)
async def create_club_logo(request: LogoGenerationRequest):
    try:
        # Generate club name and logo
        club_name, logo_description, logo_url = logo_service.generate_club(
            theme=request.themes,
            colors=request.colors
        )
        
        # Get similar logos for reference
        similar_logos = logo_service.get_similar_logos(logo_description)
        
        return LogoGenerationResponse(
            club_name=club_name,
            logo_description=logo_description,
            logo_url=logo_url,
            similar_logos=similar_logos,
            success=True
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/simulate-match")
async def simulate_match(request: Request):
    """Stream a simulated match with events until half-time."""
    try:
        data = await request.json()
        user_team = data.get("user_team")
        opponent_team = data.get("opponent_team")

        if not user_team or not opponent_team:
            raise HTTPException(status_code=400, detail="Missing team data")

        match_service.set_teams(user_team, opponent_team)
        return StreamingResponse(
            match_service.stream_match_events(),
            media_type="text/event-stream"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/continue-match")
async def continue_match():
    """Continue streaming match events from after half-time."""
    try:
        return StreamingResponse(
            match_service.continue_second_half(),
            media_type="text/event-stream"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
