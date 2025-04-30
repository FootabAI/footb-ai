from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict
import os
from dotenv import load_dotenv
from logo_rag import LogoRAG
import uvicorn
import uuid
import base64
import asyncio
import random
import json

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

# Initialize LogoRAG with the existing images directory
logo_rag = LogoRAG(reference_images_dir="images")

class LogoGenerationRequest(BaseModel):
    themes: List[str]
    colors: List[str]

class SimilarLogo(BaseModel):
    path: str
    similarity: float

class LogoGenerationResponse(BaseModel):
    club_name: str
    logo_description: str
    logo_url: str
    similar_logos: List[SimilarLogo]
    success: bool
    error: Optional[str] = None

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
    themeTags: Optional[List[str]] = None
    colorTags: Optional[List[str]] = None

class MatchEvent(BaseModel):
    minute: int
    type: str
    team: str
    description: str
    player: Optional[str] = None

class MatchStats(BaseModel):
    possession: Dict[str, int]
    shots: Dict[str, Dict[str, int]]
    passes: Dict[str, Dict[str, int]]
    corners: Dict[str, int]
    fouls: Dict[str, int]
    cards: Dict[str, Dict[str, int]]

class MatchSimulationRequest(BaseModel):
    home_team: Team
    away_team: Team
    current_minute: Optional[int] = 0

class MatchSimulationResponse(BaseModel):
    home_score: int
    away_score: int
    events: List[MatchEvent]
    stats: MatchStats





async def get_next_match_event(home_team: Team, away_team: Team, current_minute: int = 0):
    # Hardcoded match events
    match_events = [
        (12, "home", "goal", f"GOAL! {home_team.name} scores!"),
        (23, "away", "yellow_card", f"Yellow card for {away_team.name}."),
        (34, "away", "goal", f"GOAL! {away_team.name} scores!"),
        (45, "home", "yellow_card", f"Yellow card for {home_team.name}."),
        # Half-time break
        (45, "info", "half-time", "Half-time break"),
        (47, "away", "substitution", f"Substitution for {away_team.name}."),
        (58, "home", "goal", f"GOAL! {home_team.name} scores!"),
        (67, "away", "red_card", f"RED CARD! {away_team.name} is down to 10 men!"),
        (78, "home", "goal", f"GOAL! {home_team.name} scores!"),
        (85, "away", "yellow_card", f"Yellow card for {away_team.name}."),
        (90, "info", "full-time", "Full-time")
    ]
    
    # Find the next event after current_minute
    next_event = next((event for event in match_events if event[0] > current_minute), None)
    
    if not next_event:
        # If we're at the end of the match, return the last event
        last_event = match_events[-1]
        if last_event[0] <= current_minute:
            return None
        next_event = last_event
        
    minute, team, event_type, description = next_event
    
    # Calculate current score based on previous events
    home_score = sum(1 for m, t, e, _ in match_events if m <= minute and t == "home" and e == "goal")
    away_score = sum(1 for m, t, e, _ in match_events if m <= minute and t == "away" and e == "goal")
    
    # Calculate current stats
    stats = MatchStats(
        possession={"home": 50, "away": 50},
        shots={"home": {"total": 0, "onTarget": 0}, "away": {"total": 0, "onTarget": 0}},
        passes={"home": {"total": 0, "completed": 0}, "away": {"total": 0, "completed": 0}},
        corners={"home": 0, "away": 0},
        fouls={"home": 0, "away": 0},
        cards={"home": {"yellow": 0, "red": 0}, "away": {"yellow": 0, "red": 0}}
    )
    
    # Update stats based on events up to this point
    for m, t, e, _ in match_events:
        if m <= minute:
            if e == "goal":
                stats.shots[t]["onTarget"] += 1
            elif e == "yellow_card":
                stats.cards[t]["yellow"] += 1
            elif e == "red_card":
                stats.cards[t]["red"] += 1
            elif e == "corner":
                stats.corners[t] += 1
            elif e == "foul":
                stats.fouls[t] += 1
    
    event = MatchEvent(
        minute=minute,
        type=event_type,
        team=team,
        description=description
    )
    
    return {
        "minute": minute,
        "event": event.dict(),
        "score": {"home": home_score, "away": away_score},
        "stats": stats.dict()
    }

@app.post("/create_club_logo", response_model=LogoGenerationResponse)
async def create_club_logo(request: LogoGenerationRequest):
    try:
        # Generate club name and logo
        club_name, logo_description, logo_url = logo_rag.generate_club(
            theme=request.themes,
            colors=request.colors
        )
        
        # Get similar logos for reference
        similar_logos = logo_rag.get_similar_logos(logo_description)
        
        return LogoGenerationResponse(
            club_name=club_name,
            logo_description=logo_description,
            logo_url=logo_url,
            similar_logos=similar_logos,
            success=True
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



def generate_logo_url(team_name: str, color: str) -> str:
    # Remove any FC, United, etc. from the team name to get a cleaner initial
    clean_name = team_name.replace('FC', '').replace('United', '').replace('City', '').replace('Athletic', '').replace('Rovers', '').replace('Rangers', '').replace('Wanderers', '').replace('Dynamo', '').replace('Real', '').replace('Sporting', '').strip()
    
    # Get the first letter of the team name
    initial = clean_name[0].upper()
    
    # Create an SVG logo with the initial in a circular shape
    svg = f'''
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
      <defs>
        <mask id="circleMask">
          <rect width="200" height="200" fill="black" />
          <circle cx="100" cy="100" r="100" fill="white" />
        </mask>
      </defs>
      <rect width="200" height="200" fill="{color}" mask="url(#circleMask)" />
      <text x="100" y="130" font-family="Arial" font-size="90" font-weight="bold" text-anchor="middle" fill="white" mask="url(#circleMask)">{initial}</text>
    </svg>
    '''
    
    # Convert the SVG to a data URL
    return f"data:image/svg+xml;base64,{base64.b64encode(svg.encode()).decode()}"

async def generate_match_events(home_team: Team, away_team: Team, current_minute: int = 0):
    events = []
    home_score = 0
    away_score = 0
    
    # Initialize match stats
    stats = MatchStats(
        possession={"home": 50, "away": 50},
        shots={"home": {"total": 0, "onTarget": 0}, "away": {"total": 0, "onTarget": 0}},
        passes={"home": {"total": 0, "completed": 0}, "away": {"total": 0, "completed": 0}},
        corners={"home": 0, "away": 0},
        fouls={"home": 0, "away": 0},
        cards={"home": {"yellow": 0, "red": 0}, "away": {"yellow": 0, "red": 0}}
    )
    
    # Hardcoded match events
    match_events = [
        (12, "home", "goal", f"GOAL! {home_team.name} scores!"),
        (23, "away", "yellow_card", f"Yellow card for {away_team.name}."),
        (34, "away", "goal", f"GOAL! {away_team.name} scores!"),
        (45, "home", "yellow_card", f"Yellow card for {home_team.name}."),
        # Half-time break
        (45, "info", "half-time", "Half-time break"),
        (47, "away", "substitution", f"Substitution for {away_team.name}."),
        (58, "home", "goal", f"GOAL! {home_team.name} scores!"),
        (67, "away", "red_card", f"RED CARD! {away_team.name} is down to 10 men!"),
        (78, "home", "goal", f"GOAL! {home_team.name} scores!"),
        (85, "away", "yellow_card", f"Yellow card for {away_team.name}."),
        (90, "info", "full-time", "Full-time")
    ]
    
    # Calculate initial score and stats based on events up to current_minute
    for minute, team, event_type, _ in match_events:
        if minute <= current_minute:
            if event_type == "goal":
                if team == "home":
                    home_score += 1
                else:
                    away_score += 1
                stats.shots[team]["onTarget"] += 1
            elif event_type == "yellow_card":
                stats.cards[team]["yellow"] += 1
            elif event_type == "red_card":
                stats.cards[team]["red"] += 1
            elif event_type == "corner":
                stats.corners[team] += 1
            elif event_type == "foul":
                stats.fouls[team] += 1
    
    # Simulate match events after current_minute
    for minute, team, event_type, description in match_events:
        if minute <= current_minute:
            continue
            
        # Update stats based on event type
        if event_type == "goal":
            if team == "home":
                home_score += 1
            else:
                away_score += 1
            stats.shots[team]["onTarget"] += 1
        elif event_type == "yellow_card":
            stats.cards[team]["yellow"] += 1
        elif event_type == "red_card":
            stats.cards[team]["red"] += 1
        elif event_type == "corner":
            stats.corners[team] += 1
        elif event_type == "foul":
            stats.fouls[team] += 1
        
        # Create event
        event = MatchEvent(
            minute=minute,
            type=event_type,
            team=team,
            description=description
        )
        
        events.append(event)
        yield json.dumps({
            "minute": minute,
            "event": event.dict(),
            "score": {"home": home_score, "away": away_score},
            "stats": stats.dict()
        }) + "\n"
        
        # Stop at half-time if we're in the first half
        if event_type == "half-time" and current_minute < 45:
            break
            
        # Add a small delay between events
        await asyncio.sleep(0.5)

@app.post("/simulate-match")
async def simulate_match(request: MatchSimulationRequest):
    return StreamingResponse(
        generate_match_events(request.home_team, request.away_team, request.current_minute),
        media_type="text/event-stream"
    )

if __name__ == "__main__":
    load_dotenv()
    logo_rag = LogoRAG(reference_images_dir="images")
    uvicorn.run(app, host="0.0.0.0", port=8000)
