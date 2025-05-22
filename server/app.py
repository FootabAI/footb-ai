from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
import uvicorn
import base64
from typing import Dict
import json

from models.logo import LogoGenerationRequest, LogoGenerationResponse
from services.logo_service import LogoService
from services.match_service import MatchService
from services.commentary_service import CommentaryService

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
commentary_service = CommentaryService()

# Store active matches
active_matches: Dict[str, MatchService] = {}

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
    """Stream a simulated match with events until half-time."""
    try:
        data = await request.json()
        user_team = data.get("user_team")
        opponent_team = data.get("opponent_team")
        match_id = data.get("match_id")
        debug_mode = data.get("debug_mode", False)

        if not user_team or not opponent_team or not match_id:
            raise HTTPException(status_code=400, detail="Missing team data or match ID")

        print(f"\n=== Starting match: {user_team} vs {opponent_team} ===")
        print(f"Debug mode: {'ON' if debug_mode else 'OFF'}")

        # Initialize MatchService with the teams
        match_service = MatchService(
            home_team=user_team,
            away_team=opponent_team,
            use_llm=not debug_mode,
            debug_mode=debug_mode
        )
        
        # Store the match service instance
        active_matches[match_id] = match_service
        
        async def event_generator():
            try:
                async for event in match_service.stream_first_half():
                    if event:  # Only yield non-empty events
                        yield event
            except Exception as e:
                print(f"Error in event generator: {e}")
                yield json.dumps({"error": str(e)}) + "\n"
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
                "Content-Type": "text/event-stream",
                "Transfer-Encoding": "chunked"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/change-formation")
async def change_formation(request: Request):
    """Handle formation changes at half-time."""
    try:
        data = await request.json()
        match_id = data.get("match_id")
        new_formation = data.get("formation")

        if not match_id or not new_formation:
            raise HTTPException(status_code=400, detail="Missing match ID or formation data")

        if match_id not in active_matches:
            raise HTTPException(status_code=404, detail="Match not found")

        # Here you can implement formation change logic
        # For now, we'll just acknowledge the change
        return {"message": f"Formation changed to {new_formation}", "success": True}

    except Exception as e:
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
                        yield event
            except Exception as e:
                print(f"Error in event generator: {e}")
                yield json.dumps({"error": str(e)}) + "\n"
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
                "Content-Type": "text/event-stream",
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

        if not match_id or not tactic or not formation:
            raise HTTPException(status_code=400, detail="Missing match ID, tactic, or formation data")

        if match_id not in active_matches:
            raise HTTPException(status_code=404, detail="Match not found")

        # Here you can implement tactic and formation change logic
        # For now, we'll just acknowledge the change
        return {"message": f"Tactics changed to {tactic} with {formation} formation", "success": True}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# @app.post("/api/simulate-match-with-commentary")
# async def simulate_match_with_commentary(request: Request):
#     """Stream a simulated match with events and commentary until half-time."""
#     try:
#         data = await request.json()
#         user_team = data.get("user_team")
#         opponent_team = data.get("opponent_team")
#         match_id = data.get("match_id")
#         debug_mode = data.get("debug_mode", False)

#         if not user_team or not opponent_team or not match_id:
#             raise HTTPException(status_code=400, detail="Missing team data or match ID")

#         print(f"\n=== Starting match with commentary: {user_team} vs {opponent_team} ===")
#         print(f"Debug mode: {'ON' if debug_mode else 'OFF'}")

#         # Initialize MatchService with the teams
#         match_service = MatchService(
#             home_team=user_team,
#             away_team=opponent_team,
#             use_llm=not debug_mode,
#             debug_mode=debug_mode
#         )
        
#         # Store the match service instance
#         active_matches[match_id] = match_service
        
#         async def event_and_commentary_generator():
#             try:
#                 # Stream events from match service
#                 event_stream = match_service.stream_first_half()
                
#                 # Stream commentary for each event
#                 async for commentary_data in commentary_service.stream_commentary(match_id, event_stream):
#                     yield commentary_data
                    
#             except Exception as e:
#                 print(f"Error in event and commentary generator: {e}")
#                 yield json.dumps({"error": str(e)}) + "\n"
        
#         return StreamingResponse(
#             event_and_commentary_generator(),
#             media_type="text/event-stream",
#             headers={
#                 "Cache-Control": "no-cache",
#                 "Connection": "keep-alive",
#                 "X-Accel-Buffering": "no"
#             }
#         )
#     except ValueError as e:
#         raise HTTPException(status_code=400, detail=str(e))
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
