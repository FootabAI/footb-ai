import json
import numpy as np
import pandas as pd
from pathlib import Path
import random
from collections import defaultdict
import asyncio

class MatchEngineService:
    def __init__(self):
        self.base_path = Path(__file__).parent
        
        # Load existing data files
        json_path = self.base_path / "match_statistics.json"
        tactics_path = self.base_path / "tactics.json"
        
        with open(json_path, "r") as f:
            self.raw_stats = json.load(f)
        
        with open(tactics_path, "r") as f:
            self.tactics_data = json.load(f)
    
    def tactical_fit(self, attributes, requirements):
        """Calculate how well team attributes fit tactical requirements"""
        
        fits = [min(attributes.get(attr, 0) / req, 1.0) 
                for attr, req in requirements.items()]
        fit_score = np.mean(fits)
        return fit_score
    
    def get_tactical_multiplier(self, fit_score):
        """Convert tactical fit to performance multiplier"""
        if fit_score >= 0.8:
            return 1.0 + (fit_score - 0.8) * 2
        elif fit_score >= 0.6:
            return 1.0 - ((0.8 - fit_score) / 0.2)
        return 0.1
    
    def simulate_team(self, own_attrs, own_tactic, opp_attrs, opp_tactic, is_home=True):
        """Simulate team performance based on attributes and tactics"""
        prefix = "Home" if is_home else "Away"
        
        # Calculate tactical fit
        own_fit = self.tactical_fit(own_attrs, self.tactics_data[own_tactic]["requirements"])
        own_multiplier = self.get_tactical_multiplier(own_fit)
        
        opp_fit = self.tactical_fit(opp_attrs, self.tactics_data[opp_tactic]["requirements"])
        opp_multiplier = self.get_tactical_multiplier(opp_fit)
        
        # Get tactical effects
        own_effects = self.tactics_data[own_tactic]["own_effects"]
        opp_impact = self.tactics_data[opp_tactic]["opponent_effects"]
        
        # Calculate shots
        base_shots = np.random.normal(self.raw_stats[f"{prefix}Shots"]["mean"], 
                                     self.raw_stats[f"{prefix}Shots"]["std"])
        
        own_shot_bonus = own_effects["shots"] * own_multiplier
        opp_shot_penalty = opp_impact["shots"] * opp_multiplier
        total_shot_effect = own_shot_bonus + opp_shot_penalty
        
        shots = base_shots * (1 + total_shot_effect)
        shots = int(max(1, shots))
        
        # Calculate shots on target
        base_accuracy = (self.raw_stats[f"{prefix}Target"]["mean"] / 
                        self.raw_stats[f"{prefix}Shots"]["mean"])
        
        own_target_bonus = own_effects["target"] * own_multiplier
        opp_target_penalty = opp_impact["target"] * opp_multiplier
        total_target_effect = own_target_bonus + opp_target_penalty
        
        accuracy = base_accuracy * (1 + total_target_effect)
        target = min(shots, int(max(0, shots * max(0.1, accuracy))))
        
        
        # Calculate goals
        own_goal_bonus = own_effects["goals"] * own_multiplier
        opp_goal_penalty = opp_impact["goals"] * opp_multiplier
        total_goal_effect = own_goal_bonus + opp_goal_penalty
        
        goal_rate = 0.4 * (1 + total_goal_effect)
        goals = int(target * min(0.9, max(0.05, goal_rate)))
        
        # Calculate cards
        yellow = max(0, int(np.random.normal(self.raw_stats[f"{prefix}Yellow"]["mean"], 
                                           self.raw_stats[f"{prefix}Yellow"]["std"])))
        red = max(0, int(np.random.normal(self.raw_stats[f"{prefix}Red"]["mean"], 
                                        self.raw_stats[f"{prefix}Red"]["std"])))
        
        
        return {
            "shots": shots, 
            "target": target, 
            "goals": goals,
            "yellow": yellow, 
            "red": red,
            "fit": round(own_fit, 3), 
            "multiplier": round(own_multiplier, 3)
        }
    
    def simulate_half(self, home_attrs, home_tactic, away_attrs, away_tactic, half=1, context=None):
        """Generate event dictionary for a half of the match.
        
        Args:
            home_attrs: Home team attributes
            home_tactic: Home team tactic
            away_attrs: Away team attributes
            away_tactic: Away team tactic
            half: Which half to simulate (1 or 2)
            context: Optional dict containing match context (scores, stats) for second half
        """
        # Simulate both teams
        home = self.simulate_team(home_attrs, home_tactic, away_attrs, away_tactic, is_home=True)
        away = self.simulate_team(away_attrs, away_tactic, home_attrs, home_tactic, is_home=False)
        
        print(f"Home ({home_tactic}): fit={home['fit']}, multiplier={home['multiplier']}")
        print(f"Away ({away_tactic}): fit={away['fit']}, multiplier={away['multiplier']}")
        
        # Initialize event dictionary with correct minute range
        # Include 45/90 for hard-coded events but only generate random events up to 44/89
        start_minute = 46 if half == 2 else 1
        end_minute = 90 if half == 2 else 45
        event_dict = defaultdict(list)
        for i in range(start_minute, end_minute + 1):
            event_dict[i] = []
        
        # Create events list
        events = []
        for event_type in ["Shots", "Target", "Goals", "Yellow", "Red"]:
            events.extend([f"{event_type}_Home"] * home[event_type.lower()])
            events.extend([f"{event_type}_Away"] * away[event_type.lower()])
        
        # Distribute events randomly across minutes, excluding 45 and 90
        for event in events:
            random_minute = random.randint(start_minute, end_minute - 1)
            event_dict[random_minute].append(event)
        
        return dict(event_dict)
    
    async def call_llm_for_commentary(self, event_dict):
        """
        Future function to call LLM API for commentary generation.
        For now, generates simple events.
        """
        # TODO: Implement actual LLM API call with this prompt:
        """
        FINAL PROMPT (JSON OUTPUT VERSION) 
        You are given a dictionary representing match events from the first half of a soccer game. 
        Each key is a minute (1 to 45), and the value is a list of one or more event strings.
        
        ⚽️ POSSIBLE EVENT STRINGS:
        "Shots_Home" or "Shots_Away"
        "Target_Home" or "Target_Away" 
        "Goals_Home" or "Goals_Away"
        "Yellow_Home" or "Yellow_Away"
        
        🎯 TASK: For each minute with one or more events, generate one JSON object per event...
        [Full prompt would go here]
        """
        
        # Generate simple events from the event dictionary
        events_json = self.generate_simple_events(event_dict)
        print(f"Generated {len(events_json)} events")
        return events_json
    
    def generate_simple_events(self, event_dict, context=None):
        """Generate simple event descriptions without LLM.
        
        Args:
            event_dict: Dictionary of events by minute
            context: Optional dict containing match context (scores, stats) for second half
        """
        events_json = []
        current_score = context.get("score", {"home": 0, "away": 0}) if context else {"home": 0, "away": 0}
        
        # Initialize stats tracking from context or default to 0
        stats = {
            "home": {
                "shots": context.get("stats", {}).get("home", {}).get("shots", 0) if context else 0,
                "shotsOnTarget": context.get("stats", {}).get("home", {}).get("shotsOnTarget", 0) if context else 0,
                "yellowCards": context.get("stats", {}).get("home", {}).get("yellowCards", 0) if context else 0,
                "redCards": context.get("stats", {}).get("home", {}).get("redCards", 0) if context else 0
            },
            "away": {
                "shots": context.get("stats", {}).get("away", {}).get("shots", 0) if context else 0,
                "shotsOnTarget": context.get("stats", {}).get("away", {}).get("shotsOnTarget", 0) if context else 0,
                "yellowCards": context.get("stats", {}).get("away", {}).get("yellowCards", 0) if context else 0,
                "redCards": context.get("stats", {}).get("away", {}).get("redCards", 0) if context else 0
            }
        }
        
        # Event type mapping
        event_mapping = {
            "Shots_Home": {"type": "shot", "team": "home", "desc": "Powerful shot from home side!"},
            "Shots_Away": {"type": "shot", "team": "away", "desc": "Away team with a shot!"},
            "Target_Home": {"type": "target", "team": "home", "desc": "Shot on target by home!"},
            "Target_Away": {"type": "target", "team": "away", "desc": "On target by away team!"},
            "Goals_Home": {"type": "goal", "team": "home", "desc": "Goal for home team!"},
            "Goals_Away": {"type": "goal", "team": "away", "desc": "Goal for away team!"},
            "Yellow_Home": {"type": "yellow_card", "team": "home", "desc": "Yellow card for home!"},
            "Yellow_Away": {"type": "yellow_card", "team": "away", "desc": "Yellow card for away!"}
        }
        
        # Process each minute
        for minute in sorted(event_dict.keys()):
            minute_events = event_dict.get(minute, [])
            
            # Generate events for this minute
            for event_str in minute_events:
                if event_str in event_mapping:
                    event_info = event_mapping[event_str]
                    team = event_info["team"]
                    
                    # Update stats based on event type
                    if event_info["type"] == "shot":
                        stats[team]["shots"] += 1
                    elif event_info["type"] == "target":
                        stats[team]["shotsOnTarget"] += 1
                    elif event_info["type"] == "yellow_card":
                        stats[team]["yellowCards"] += 1
                    elif event_info["type"] == "red_card":
                        stats[team]["redCards"] += 1
                    
                    # Update score for goals
                    if event_info["type"] == "goal":
                        current_score[team] += 1
                    
                    # Create event object
                    event_obj = {
                        "type": "event",
                        "minute": minute,
                        "event": {
                            "team": team,
                            "type": event_info["type"],
                            "event_description": event_info["desc"],
                            "audio_url": f"Commentary for {event_info['desc']}"
                        },
                        "score": current_score.copy(),
                        "stats": {
                            "home": stats["home"].copy(),
                            "away": stats["away"].copy()
                        }
                    }
                    events_json.append(event_obj)
            
            # Always add minute update with current stats
            minute_update = {
                "type": "minute_update",
                "minute": minute,
                "score": current_score.copy(),
                "stats": {
                    "home": stats["home"].copy(),
                    "away": stats["away"].copy()
                }
            }
            events_json.append(minute_update)
            
            # Add half-time or full-time event
            if minute == 45:
                half_time_event = {
                    "type": "event",
                    "minute": 45,
                    "event": {
                        "team": "system",
                        "type": "half-time",
                        "event_description": "Half-time whistle!",
                        "audio_url": "Commentary for half-time"
                    },
                    "score": current_score.copy(),
                    "stats": {
                        "home": stats["home"].copy(),
                        "away": stats["away"].copy()
                    }
                }
                events_json.append(half_time_event)
            elif minute == 90:
                full_time_event = {
                    "type": "event",
                    "minute": 90,
                    "event": {
                        "team": "system",
                        "type": "full-time",
                        "event_description": "Full-time whistle!",
                        "audio_url": "Commentary for full-time"
                    },
                    "score": current_score.copy(),
                    "stats": {
                        "home": stats["home"].copy(),
                        "away": stats["away"].copy()
                    }
                }
                events_json.append(full_time_event)
        
        return events_json

# Global instance for backward compatibility
match_engine = MatchEngineService()

# Test function (for standalone testing)
def test_simulation():
    """Test function to run simulation"""
    PLAYER_ATTRS = {"passing": 100, "dribbling": 100, "shooting": 100, 
                    "defending": 100, "pace": 100, "physicality": 100}
    OPPONENT_ATTRS = {"passing": 100, "dribbling": 100, "shooting": 100,
                      "defending": 100, "pace": 100, "physicality": 100}
    
    # Generate events
    event_dict = match_engine.simulate_half(
        PLAYER_ATTRS, "tiki-taka", 
        OPPONENT_ATTRS, "gegenpressing"
    )
    
    print("\n=== EVENT DICTIONARY ===")
    print(event_dict)
    
    # Test loading JSON file
    import asyncio
    events_json = asyncio.run(match_engine.call_llm_for_commentary(event_dict))
    print(f"\n=== LOADED {len(events_json)} EVENTS ===")
    print(f"First event: {events_json[0] if events_json else 'None'}")

if __name__ == "__main__":
    test_simulation()