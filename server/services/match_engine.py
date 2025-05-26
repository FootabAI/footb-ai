import json
import numpy as np
import pandas as pd
from pathlib import Path


PLAYER_TACTIC = "tiki-taka"
OPPONENT_TACTIC = "gegenpressing"

PLAYER_ATTRS = {"passing": 10, "dribbling": 10, "shooting": 10, 
                "defending": 10, "pace": 10, "physicality": 10}
OPPONENT_ATTRS = {"passing": 120, "dribbling": 120, "shooting": 120,
                  "defending": 120, "pace": 120, "physicality": 120}

json_path = Path(__file__).parent / "match_statistics.json"
tactics_path = Path(__file__).parent / "tactics.json"

with open(json_path, "r") as f:
    raw_stats = json.load(f)

with open(tactics_path, "r") as f:
    tactics_data = json.load(f)

def tactical_fit(attributes, requirements):
    fits = [min(attributes.get(attr, 0) / req, 1.0) 
            for attr, req in requirements.items()]
    return np.mean(fits)

def get_tactical_multiplier(fit_score):
    if fit_score >= 0.8:
        return 1.0 + (fit_score - 0.8) * 2
    elif fit_score >= 0.6:
        return 1.0 - ((0.8 - fit_score) / 0.2)
    return 0.1

def simulate_team(own_attrs, own_tactic, opp_attrs, opp_tactic, is_home=True):
    prefix = "Home" if is_home else "Away"
    
    # Beregn taktisk fit
    own_fit = tactical_fit(own_attrs, tactics_data[own_tactic]["requirements"])
    own_multiplier = get_tactical_multiplier(own_fit)
    
    opp_fit = tactical_fit(opp_attrs, tactics_data[opp_tactic]["requirements"])
    opp_multiplier = get_tactical_multiplier(opp_fit)
    
    # Hent effekter
    own_effects = tactics_data[own_tactic]["own_effects"]
    opp_impact = tactics_data[opp_tactic]["opponent_effects"]
    
    # Sample grunnverdier
    base_shots = np.random.normal(raw_stats[f"{prefix}Shots"]["mean"], 
                                 raw_stats[f"{prefix}Shots"]["std"])
    
    # Beregn totale effekter
    own_shot_bonus = own_effects["shots"] * own_multiplier
    opp_shot_penalty = opp_impact["shots"] * opp_multiplier
    total_shot_effect = own_shot_bonus + opp_shot_penalty
    
    shots = base_shots * (1 + total_shot_effect)
    shots = int(max(1, shots))
    
    # Skudd på mål
    base_accuracy = (raw_stats[f"{prefix}Target"]["mean"] / 
                    raw_stats[f"{prefix}Shots"]["mean"])
    
    own_target_bonus = own_effects["target"] * own_multiplier
    opp_target_penalty = opp_impact["target"] * opp_multiplier
    total_target_effect = own_target_bonus + opp_target_penalty
    
    accuracy = base_accuracy * (1 + total_target_effect)
    target = min(shots, int(max(0, shots * max(0.1, accuracy))))
    
    # Mål
    own_goal_bonus = own_effects["goals"] * own_multiplier
    opp_goal_penalty = opp_impact["goals"] * opp_multiplier
    total_goal_effect = own_goal_bonus + opp_goal_penalty
    
    goal_rate = 0.4 * (1 + total_goal_effect)
    goals = int(target * min(0.9, max(0.05, goal_rate)))
    
    # Kort
    yellow = max(0, int(np.random.normal(raw_stats[f"{prefix}Yellow"]["mean"], 
                                       raw_stats[f"{prefix}Yellow"]["std"])))
    red = max(0, int(np.random.normal(raw_stats[f"{prefix}Red"]["mean"], 
                                    raw_stats[f"{prefix}Red"]["std"])))
    
    return {
        "shots": shots, "target": target, "goals": goals,
        "yellow": yellow, "red": red,
        "fit": round(own_fit, 3), 
        "multiplier": round(own_multiplier, 3)
    }

def simulate_match():
    home = simulate_team(PLAYER_ATTRS, PLAYER_TACTIC, OPPONENT_ATTRS, OPPONENT_TACTIC, is_home=True)
    away = simulate_team(OPPONENT_ATTRS, OPPONENT_TACTIC, PLAYER_ATTRS, PLAYER_TACTIC, is_home=False)
    
    print(f"Home ({PLAYER_TACTIC}): fit={home['fit']}, multiplier={home['multiplier']}")
    print(f"Away ({OPPONENT_TACTIC}): fit={away['fit']}, multiplier={away['multiplier']}")
    
    return pd.DataFrame({
        "Home": [home["shots"], home["target"], home["goals"], home["yellow"], home["red"]],
        "Away": [away["shots"], away["target"], away["goals"], away["yellow"], away["red"]]
    }, index=["Shots", "Target", "Goals", "Yellow", "Red"])

# Kjør simulering
result = simulate_match()
print("\n=== KAMPRESULTAT ===")
print(result)