from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import uvicorn
import json
from pathlib import Path
import asyncio
from typing import Dict

from models.logo import LogoGenerationRequest, LogoGenerationResponse
from services.logo_service import LogoService
from services.simple_tactical_match import SimpleTacticalMatch

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

# Store active matches
active_matches: Dict[str, SimpleTacticalMatch] = {}

@app.post("/create_club_logo", response_model=LogoGenerationResponse)
async def create_club_logo(request: LogoGenerationRequest):
    try:
        # Generate club name and logo
        club_name, logo_description, logo_url, main_color = logo_service.generate_club(
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
            main_color=main_color,
            success=True
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/simulate-match")
async def simulate_match(request: Request):
    """Simulate a match with events."""
    try:
        data = await request.json()
        user_team_data = data.get("user_team")
        opponent_team_data = data.get("opponent_team")
        match_id = data.get("match_id")
        half = data.get("half", "first")  # Default to first half
        match_length = data.get("match_length", 30)  # Default 2 minutes (120 seconds)
        time_scale = data.get("time_scale", 1.0)  # Default real-time
        
        if not user_team_data or not opponent_team_data or not match_id:
            raise HTTPException(status_code=400, detail="Missing team data or match ID")
        
        print(f"\n=== Starting {half} half: {user_team_data['name']} vs {opponent_team_data['name']} ===")
        
        # Get or create match instance
        if match_id not in active_matches:
            active_matches[match_id] = SimpleTacticalMatch(
                home_team=user_team_data["name"],
                away_team=opponent_team_data["name"],
                home_attributes=user_team_data["attributes"],
                away_attributes=opponent_team_data["attributes"],
                home_tactic=user_team_data["tactic"],
                away_tactic=opponent_team_data["tactic"],
                match_length=match_length,
                time_scale=time_scale,
                
            )
        
        match = active_matches[match_id]
        
        # If it's second half and tactics have changed, update them
        if half == "second" and "new_tactic" in data:
            print(f"\n=== Tactical Change ===")
            print(f"Team: {user_team_data['name']}")
            print(f"Old Tactic: {match.home_tactic}")
            print(f"New Tactic: {data['new_tactic']}")
            
            # Update tactic and get new effects
            updated_effects = match.update_tactic("home", data["new_tactic"])
            
            print("\nUpdated Tactical Fit Scores:")
            print(f"Home TFS: {updated_effects['home_tfs']:.4f}")
            print(f"Away TFS: {updated_effects['away_tfs']:.4f}")
            
            print("\nUpdated Match Effects:")
            print("Home Team Effects:")
            for effect, value in updated_effects['home_effects'].items():
                print(f"- {effect}: {value:.4f}")
            print("\nAway Team Effects:")
            for effect, value in updated_effects['away_effects'].items():
                print(f"- {effect}: {value:.4f}")
            
            print("\nTactical change applied successfully")
            print("==================\n")
        
        async def event_generator():
            try:
                if half == "first":
                    async for event in match.stream_first_half():
                        yield event
                else:
                    async for event in match.stream_second_half():
                        yield event
            except Exception as e:
                print(f"Error in event generator: {e}")
                yield json.dumps({"error": str(e)}) + "\n"
        
        return StreamingResponse(
            event_generator(),
            media_type="application/x-ndjson",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
                "Content-Type": "application/x-ndjson",
                "Transfer-Encoding": "chunked"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
