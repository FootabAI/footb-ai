from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import uvicorn
import base64
from typing import Dict, Optional
import json
from pathlib import Path
import asyncio

from models.logo import LogoGenerationRequest, LogoGenerationResponse
from models.players import PlayerGenerationRequest, PlayerGenerationResponse
from services.logo_service import LogoService
from services.match_service import MatchService
from services.player_name_service import PlayerNameService
from services.tts_service import TTSService


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

# Initialize services
logo_service = LogoService(reference_images_dir="images")
tts_service = TTSService()

# Global settings
USE_LLM = False  # Central control for LLM commentary
USE_TTS = False  # Central control for TTS

# Store active matches
active_matches: Dict[str, MatchService] = {}
player_name_service = PlayerNameService()

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

@app.post("/api/generate_player_names", response_model=PlayerGenerationResponse)
async def generate_player_names(request: PlayerGenerationRequest):
    """
    Produce realistic-sounding footballer names.
    """
    try:
        player = player_name_service.generate_player(
            nationality   = request.nationality,
            with_position= request.with_positions,
        )
        return PlayerGenerationResponse(
            player   = player,
            success = True,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/simulate-match")
async def simulate_match(request: Request):
    """Stream a simulated match with events until half-time."""
    try:
        data = await request.json()
        user_team_data = data.get("user_team")
        opponent_team_data = data.get("opponent_team")
        match_id = data.get("match_id")

        if not user_team_data or not opponent_team_data or not match_id:
            raise HTTPException(status_code=400, detail="Missing team data or match ID")

        print(f"\n=== Starting match: {user_team_data['name']} vs {opponent_team_data['name']} ===")
        print(f"LLM Commentary: {'ON' if USE_LLM else 'OFF'}")
        print(f"TTS: {'ON' if USE_TTS else 'OFF'}")


        # ! NEW FUNCTION 
        # TODO: ARGS: 
            # * home_team_attributes=user_team_data["attributes"],
            # * away_team_attributes=opponent_team_data["attributes"],
            # * home_team_tactic=user_team_data["tactic"],
            # * away_team_tactic=opponent_team_data["tactic"],
        # ! Load JSON file
          # ! Use team attributes to calculate match stats 
          # ! Pass into match service


        # Initialize MatchService with the teams and their attributes
        match_service = MatchService(
            home_team=user_team_data["name"],
            away_team=opponent_team_data["name"],
            use_llm=USE_LLM,  # Use central control
            debug_mode=not USE_LLM,  # Use debug mode when LLM is off
            home_team_attributes=user_team_data["attributes"],
            away_team_attributes=opponent_team_data["attributes"],
            home_team_tactic=user_team_data["tactic"],
            away_team_tactic=opponent_team_data["tactic"],
            home_team_formation=user_team_data["formation"],
            away_team_formation=opponent_team_data["formation"],
            home_team_stats=user_team_data["teamStats"],
            away_team_stats=opponent_team_data["teamStats"]
            # TODO: Add NEW FUNCTION here...
        )
        
        # Store the match service instance
        active_matches[match_id] = match_service
        
        async def event_generator():
            try:
                async for event in match_service.stream_first_half():
                    if event:  # Only yield non-empty events
                        # Add TTS audio URL if TTS is enabled
                        if USE_TTS:
                            event_data = json.loads(event)
                            if ("event" in event_data and 
                                "commentary" in event_data["event"] and 
                                event_data["event"]["commentary"] is not None):
                                audio_url = await tts_service.generate_audio(
                                    event_data["event"]["commentary"],
                                    event_data["event"]["type"]
                                )
                                if audio_url:
                                    event_data["event"]["audio_url"] = audio_url
                            event = json.dumps(event_data) + "\n"
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
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/simulate-match-new")
async def simulate_match_new(request: Request):
    """Stream a simulated match with events using the new match engine."""
    try:
        data = await request.json()
        user_team_data = data.get("user_team")
        opponent_team_data = data.get("opponent_team")
        match_id = data.get("match_id")

        if not user_team_data or not opponent_team_data or not match_id:
            raise HTTPException(status_code=400, detail="Missing team data or match ID")

        print(f"\n=== Starting match with new engine: {user_team_data['name']} vs {opponent_team_data['name']} ===")
        print(f"User team data: {json.dumps(user_team_data, indent=2)}")
        print(f"Opponent team data: {json.dumps(opponent_team_data, indent=2)}")

        # Initialize match engine
        from services.match_engine import MatchEngineService
        match_engine = MatchEngineService()

        try:
            # Generate events for first half
            event_dict = match_engine.simulate_half(
                home_attrs=user_team_data["attributes"],
                home_tactic=user_team_data["tactic"],
                away_attrs=opponent_team_data["attributes"],
                away_tactic=opponent_team_data["tactic"]
            )
            print(f"Generated event dict: {json.dumps(event_dict, indent=2)}")

            # Get commentary for events
            events_json = await match_engine.call_llm_for_commentary(event_dict)
            print(f"Generated events JSON: {json.dumps(events_json[:2], indent=2)}")  # Print first 2 events

            # Sort events by minute
            events_json.sort(key=lambda x: x["minute"])

        except Exception as e:
            print(f"Error in match simulation: {str(e)}")
            print(f"Error type: {type(e)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            raise

        async def event_generator():
            try:
                # Sort events by minute to ensure chronological order
                events_json.sort(key=lambda x: x["minute"])
                
                for event in events_json:
                    if event:  # Only yield non-empty events
                        # Add TTS audio URL if TTS is enabled
                        if USE_TTS:
                            if ("event" in event and 
                                "commentary" in event["event"] and 
                                event["event"]["commentary"] is not None):
                                audio_url = await tts_service.generate_audio(
                                    event["event"]["commentary"],
                                    event["event"]["type"]
                                )
                                if audio_url:
                                    event["event"]["audio_url"] = audio_url
                        yield json.dumps(event) + "\n"
                        # Add a small delay between events for better readability
                        await asyncio.sleep(0.5)
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
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
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

        if not match_id:
            raise HTTPException(status_code=400, detail="Missing match ID")

        if match_id not in active_matches:
            raise HTTPException(status_code=404, detail="Match not found")

        print("\n=== Starting second half ===")
        match_service = active_matches[match_id]
        
        async def event_generator():
            try:
                async for event in match_service.stream_second_half():
                    if event:  # Only yield non-empty events
                        # Add TTS audio URL if TTS is enabled
                        if USE_TTS:
                            event_data = json.loads(event)
                            if ("event" in event_data and 
                                "commentary" in event_data["event"] and 
                                event_data["event"]["commentary"] is not None):
                                audio_url = await tts_service.generate_audio(
                                    event_data["event"]["commentary"],
                                    event_data["event"]["type"]
                                )
                                if audio_url:
                                    event_data["event"]["audio_url"] = audio_url
                            event = json.dumps(event_data) + "\n"
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
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/change-team-tactic")
async def change_team_tactic(request: Request):
    """Handle tactic and formation changes at half-time."""
    try:
        data = await request.json()
        match_id = data.get("match_id")
        tactic = data.get("tactic")
        formation = data.get("formation")

        print(f"\n=== Tactics Change Request ===")
        print(f"Match ID: {match_id}")
        print(f"New Tactic: {tactic}")
        print(f"New Formation: {formation}")

        if not match_id or not tactic or not formation:
            raise HTTPException(status_code=400, detail="Missing match ID, tactic, or formation data")

        if match_id not in active_matches:
            raise HTTPException(status_code=404, detail="Match not found")

        # Get the match service instance
        match_service = active_matches[match_id]
        
        print(f"\n=== Current Match State ===")
        print(f"Home Team: {match_service.home_team}")
        print(f"Current Tactic: {match_service.home_team_tactic}")
        print(f"Current Formation: {match_service.home_team_formation}")
        
        # Update the home team's tactic and formation
        match_service.home_team_tactic = tactic
        match_service.home_team_formation = formation
        
        # Recalculate match parameters based on new tactics
        match_service._adjust_parameters_from_attributes()
        
        print(f"\n=== Updated Match State ===")
        print(f"New Tactic: {match_service.home_team_tactic}")
        print(f"New Formation: {match_service.home_team_formation}")
        print(f"Updated Parameters:")
        print(f"- Goals Lambda Home: {match_service.GOALS_LAMBDA_HOME}")
        print(f"- Possession Home: {match_service.POSSESSION_HOME}")
        print(f"- Shots Home: {match_service.SHOTS_HOME}")

        return {
            "message": f"Tactics changed to {tactic} with {formation} formation",
            "success": True,
            "new_tactic": tactic,
            "new_formation": formation,
            "updated_parameters": {
                "goals_lambda": match_service.GOALS_LAMBDA_HOME,
                "possession": match_service.POSSESSION_HOME,
                "shots": match_service.SHOTS_HOME
            }
        }

    except Exception as e:
        print(f"Error in change_team_tactic: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
