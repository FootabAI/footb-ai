from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import uvicorn
import base64
from typing import Dict, Optional
import json
from pathlib import Path

import io
import random
import torch
import asyncio


from models.logo import LogoGenerationRequest, LogoGenerationResponse
from models.players import PlayerGenerationRequest, PlayerGenerationResponse
from services.club_logo_service.logo_service import LogoService
from services.match_service import MatchService
from services.player_names.player_name_service import PlayerNameService
from services.player_image_service.player_image_service import PlayerImageService


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

# Create temp_audio directory if it doesn't exist
temp_audio_dir = Path("temp_audio")
temp_audio_dir.mkdir(exist_ok=True)

# Mount the temp_audio directory to serve audio files
app.mount("/audio", StaticFiles(directory="temp_audio"), name="audio")

# Custom route to serve audio files with correct MIME type
@app.get("/audio/{filename}")
async def get_audio(filename: str):
    audio_path = temp_audio_dir / filename
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(
        audio_path,
        media_type="audio/mpeg",
        filename=filename
    )

# Global settings
USE_LLM = True  # Central control for LLM commentary
USE_TTS = True   # Central control for TTS audio generation

# Initialize services
logo_service = LogoService(reference_images_dir="./services/club_logo_service/images")

player_image_service = PlayerImageService(pose_image_path="./services/player_image_service/reference-1.png")

# Store active matches
active_matches: Dict[str, MatchService] = {}

player_name_service = PlayerNameService()


@app.post("/create_club_logo", response_model=LogoGenerationResponse)
async def create_club_logo(request: LogoGenerationRequest):
    try:
        # Validate input
        if not request.themes:
            raise HTTPException(status_code=400, detail="At least one theme is required")
        if len(request.themes) > 2:
            raise HTTPException(status_code=400, detail="Maximum of 2 themes allowed")
        if len(request.colors) > 3:
            raise HTTPException(status_code=400, detail="Maximum of 3 colors allowed")
        
        # Generate club name and logo
        club_name, logo_description, logo_url, main_color = logo_service.generate_club(
            themes=request.themes,
            colors=request.colors
        )
        
        # Get similar logos for reference
        similar_logos = logo_service.get_similar_logos(logo_description)
        
        # Create the response
        response = LogoGenerationResponse(
            club_name=club_name,
            logo_description=logo_description,
            logo_url=logo_url,
            similar_logos=similar_logos,
            main_color=main_color,
            success=True
        )
        
        print(f"Response: {response}")
        
        
        return response
        
    except Exception as e:
        print(f"Error in create_club_logo: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate_player_names")
async def generate_player_names(request: PlayerGenerationRequest):
    """
    Produce realistic-sounding footballer names with streaming response.
    """
    try:
        async def player_generator():
            # Generate 11 players
            for _ in range(11):
                player = player_name_service.generate_player(
                    nationality=request.nationality
                )
                response = PlayerGenerationResponse(
                    player=player,
                    success=True,
                )
                yield f"{response.model_dump_json()}\n"

        return StreamingResponse(
            player_generator(),
            media_type="application/x-ndjson",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/simulate-match-new")
async def simulate_match_new(request: Request):
    try:
        data = await request.json()
        user_team = data.get("user_team")
        opponent_team = data.get("opponent_team")
        match_id = data.get("match_id")
        
        if not all([user_team, opponent_team, match_id]):
            raise HTTPException(status_code=400, detail="Missing required data")
        
        # Initialize match engine with global settings
        from services.match_engine.match_engine import MatchEngineService
        match_engine = MatchEngineService(use_llm=USE_LLM, use_tts=USE_TTS)
        
        # Set match context for commentary
        match_engine.set_match_context(
            home_team=user_team["name"],
            away_team=opponent_team["name"],
            home_tactic=user_team["tactic"],
            away_tactic=opponent_team["tactic"]
        )
        
        # Generate events for first half with required parameters
        events = match_engine.simulate_half(
            home_attrs=user_team["attributes"],
            home_tactic=user_team["tactic"],
            away_attrs=opponent_team["attributes"],
            away_tactic=opponent_team["tactic"],
            half=1
        )
        
        # Sort events by minute
        sorted_minutes = sorted(events.keys())
        
        async def event_generator():
            # Process events in batches of 5 minutes
            batch_size = 5
            current_batch = []
            
            for minute in sorted_minutes:
                minute_events = events.get(minute, [])
                
                # Create event objects for this minute
                for event_str in minute_events:
                    event_obj = match_engine.create_event_object(
                        event_str=event_str,
                        minute=minute,
                        current_score=match_engine.commentary_service.match_context.current_score,
                        current_stats=match_engine.commentary_service.match_context.current_stats
                    )
                    current_batch.append(event_obj)
                
                # Add minute update
                minute_update = {
                    "type": "minute_update",
                    "minute": minute,
                    "score": match_engine.commentary_service.match_context.current_score.copy(),
                    "stats": match_engine.commentary_service.match_context.current_stats.copy()
                }
                current_batch.append(minute_update)
                
                # Add half-time or full-time event if needed
                if minute == 45:
                    half_time_event = match_engine.create_system_event(
                        event_type="half-time",
                        minute=45,
                        current_score=match_engine.commentary_service.match_context.current_score,
                        current_stats=match_engine.commentary_service.match_context.current_stats
                    )
                    current_batch.append(half_time_event)
                elif minute == 90:
                    full_time_event = match_engine.create_system_event(
                        event_type="full-time",
                        minute=90,
                        current_score=match_engine.commentary_service.match_context.current_score,
                        current_stats=match_engine.commentary_service.match_context.current_stats
                    )
                    current_batch.append(full_time_event)
                
                # If we've reached the batch size or this is the last minute, process and stream the batch
                if len(current_batch) >= batch_size or minute == sorted_minutes[-1]:
                    # Generate commentary for the batch
                    current_batch = match_engine.commentary_service.add_events(current_batch)
                    # Stream the batch
                    yield json.dumps({"batch": current_batch}) + "\n"
                    # Add a small delay between batches
                    await asyncio.sleep(0.5)
                    current_batch = []
        
        return StreamingResponse(
            event_generator(),
            media_type="application/x-ndjson"
        )
        
    except Exception as e:
        print(f"Error in simulate-match-new: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/continue-match")
async def continue_match(request: Request):
    """Continue streaming match events from after half-time."""
    try:
        data = await request.json()
        match_id = data.get("match_id")
        home_attrs = data.get("home_attrs")
        away_attrs = data.get("away_attrs")
        home_tactic = data.get("home_tactic")
        away_tactic = data.get("away_tactic")
        formation = data.get("formation")
        current_score = data.get("current_score", {"home": 0, "away": 0})
        current_stats = data.get("current_stats", {
            "home": {},
            "away": {}
        })

        if not all([match_id, home_attrs, away_attrs, home_tactic, away_tactic]):
            raise HTTPException(status_code=400, detail="Missing required data")

        print(f"\n=== Starting second half ===")
        print(f"Match ID: {match_id}")
        print(f"Home Tactic: {home_tactic}")
        print(f"Away Tactic: {away_tactic}")
        print(f"Formation: {formation}")

        # Initialize match engine with global settings
        from services.match_engine.match_engine import MatchEngineService
        match_engine = MatchEngineService(use_llm=USE_LLM, use_tts=USE_TTS)

        # Set match context for commentary
        match_engine.set_match_context(
            home_team=data.get("home_team_name", "Home Team"),
            away_team=data.get("away_team_name", "Away Team"),
            home_tactic=home_tactic,
            away_tactic=away_tactic
        )
        
        # Update context with current score and stats
        if match_engine.commentary_service.match_context:
            match_engine.commentary_service.match_context.current_score = current_score
            match_engine.commentary_service.match_context.current_stats = current_stats
            match_engine.commentary_service.match_context.half = 2

        # Generate events for second half
        events = match_engine.simulate_half(
            home_attrs=home_attrs,
            home_tactic=home_tactic,
            away_attrs=away_attrs,
            away_tactic=away_tactic,
            half=2,
            context={
                "score": current_score,
                "stats": current_stats
            }
        )

        # Sort events by minute
        sorted_minutes = sorted(events.keys())
        
        async def event_generator():
            # Process events in batches of 5 minutes
            batch_size = 5
            current_batch = []
            
            for minute in sorted_minutes:
                minute_events = events.get(minute, [])
                
                # Create event objects for this minute
                for event_str in minute_events:
                    event_obj = match_engine.create_event_object(
                        event_str=event_str,
                        minute=minute,
                        current_score=match_engine.commentary_service.match_context.current_score,
                        current_stats=match_engine.commentary_service.match_context.current_stats
                    )
                    current_batch.append(event_obj)
                
                # Add minute update
                minute_update = {
                    "type": "minute_update",
                    "minute": minute,
                    "score": match_engine.commentary_service.match_context.current_score.copy(),
                    "stats": match_engine.commentary_service.match_context.current_stats.copy()
                }
                current_batch.append(minute_update)
                
                # Add full-time event if needed
                if minute == 90:
                    full_time_event = match_engine.create_system_event(
                        event_type="full-time",
                        minute=90,
                        current_score=match_engine.commentary_service.match_context.current_score,
                        current_stats=match_engine.commentary_service.match_context.current_stats
                    )
                    current_batch.append(full_time_event)
                
                # If we've reached the batch size or this is the last minute, process and stream the batch
                if len(current_batch) >= batch_size or minute == sorted_minutes[-1]:
                    # Generate commentary for the batch
                    current_batch = match_engine.commentary_service.add_events(current_batch)
                    # Stream the batch
                    yield json.dumps({"batch": current_batch}) + "\n"
                    # Add a small delay between batches
                    await asyncio.sleep(0.5)
                    current_batch = []

        return StreamingResponse(
            event_generator(),
            media_type="application/x-ndjson"
        )

    except Exception as e:
        print(f"Error in continue-match: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate_player_image")
async def generate_player_image(request: Request):
    """Generate a single player image with streaming response"""
    try:
        data = await request.json()
        player_data = data.get("player")
        if not player_data:
            raise HTTPException(status_code=400, detail="Missing player data")
        
        async def image_generator():
            try:
                # Generate single player image
                print(f"🎨 Generating image for player: {player_data['name']}")
                result = player_image_service.generate_player_image(player_data)
                print(f"✅ Generated image for {player_data['name']}")
                
                # Stream the result
                response = {
                    "success": True,
                    "player": result
                }
                yield f"{json.dumps(response)}\n"
                
            except Exception as e:
                print(f"❌ Error generating image: {e}")
                error_response = {
                    "success": False,
                    "error": str(e)
                }
                yield f"{json.dumps(error_response)}\n"
        
        return StreamingResponse(
            image_generator(),
            media_type="application/x-ndjson",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )
        
    except Exception as e:
        print(f"❌ Error in generate_player_image endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
