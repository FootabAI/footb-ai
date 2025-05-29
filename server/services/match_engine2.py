import json
import numpy as np
import pandas as pd
from pathlib import Path

# ============ KAMPOPPSETT ============
PLAYER_TACTIC = "tiki-taka"
OPPONENT_TACTIC = "gegenpressing"

PLAYER_ATTRS = {"passing": 100, "dribbling": 100, "shooting": 100, 
                "defending": 100, "pace": 100, "physicality": 100}
OPPONENT_ATTRS = {"passing": 20, "dribbling": 20, "shooting": 20,
                  "defending": 20, "pace": 20, "physicality": 20}

# ============ KAMPFORHOLD ============
HOME_ADVANTAGE = 0.15          # Hjemmebanefordel (15% bonus)
WEATHER = "sunny"              # "sunny", "rainy", "windy", "snow"
STADIUM_SIZE = "large"         # "small", "medium", "large" 
CROWD_SUPPORT = "high"         # "low", "medium", "high", "hostile"

# ============ LAGETS TILSTAND ============
PLAYER_MORALE = 0.8           # 0.0-1.0 (dårlig-utmerket moral)
OPPONENT_MORALE = 0.2
PLAYER_FATIGUE = 0.2          # 0.0-1.0 (frisk-utslitt)
OPPONENT_FATIGUE = 0.7
PLAYER_FORM = 0.9             # 0.0-1.0 (dårlig-toppform)
OPPONENT_FORM = 0.3

# ============ SPILLESTIL ============
AGGRESSION_LEVEL = 0.6        # 0.0-1.0 (passiv-aggressiv)
TEMPO = "high"                # "slow", "medium", "high"
RISK_TAKING = 0.7             # 0.0-1.0 (trygt-risikofylt spill)

# ============ SIMULERINGSSETT ============
ENABLE_INJURIES = True        # Skader på/av
ENABLE_SUBSTITUTIONS = True   # Bytter på/av  
ENABLE_TIME_EFFECTS = True    # Utmattelse over tid
RANDOM_EVENTS = True          # Tilfeldige hendelser

# Last inn filer
json_path = Path(__file__).parent / "match_statistics.json"
tactics_path = Path(__file__).parent / "tactics.json"

with open(json_path, "r") as f:
    raw_stats = json.load(f)

with open(tactics_path, "r") as f:
    tactics_data = json.load(f)

def get_weather_effect(weather):
    """Væreffekter på spill"""
    effects = {
        "sunny": {"shots": 0.0, "target": 0.0, "goals": 0.0},
        "rainy": {"shots": -0.1, "target": -0.15, "goals": -0.05},
        "windy": {"shots": 0.05, "target": -0.2, "goals": -0.1},
        "snow": {"shots": -0.15, "target": -0.25, "goals": -0.15}
    }
    return effects.get(weather, effects["sunny"])

def get_crowd_effect(support, is_home):
    """Publikumseffekt - påvirker bare hjemmelaget positivt"""
    if not is_home:
        return 0.0
    
    effects = {"low": 0.02, "medium": 0.05, "high": 0.1, "hostile": -0.05}
    return effects.get(support, 0.0)

def get_stadium_effect(size):
    """Stadioneffekt - større stadion = mer press"""
    effects = {
        "small": {"yellow": -0.1, "red": -0.1},
        "medium": {"yellow": 0.0, "red": 0.0},
        "large": {"yellow": 0.1, "red": 0.05}
    }
    return effects.get(size, effects["medium"])

def get_condition_multiplier(morale, fatigue, form):
    """Beregn samlet tilstandsmultiplier"""
    # Moral: 0.5-1.5x
    morale_mult = 0.5 + morale
    # Utmattelse: 1.0-0.3x (jo mer sliten, jo dårligere)
    fatigue_mult = 1.0 - (fatigue * 0.7)
    # Form: 0.3-1.3x
    form_mult = 0.3 + form
    
    return (morale_mult + fatigue_mult + form_mult) / 3

def get_aggression_effect(aggression):
    """Aggressivitet påvirker kort og intensitet"""
    return {
        "shots": aggression * 0.2,
        "yellow": aggression * 0.5,
        "red": aggression * 0.8
    }

def get_tempo_effect(tempo):
    """Spilltempo påvirker intensitet"""
    effects = {
        "slow": {"shots": -0.15, "target": 0.1, "yellow": -0.2},
        "medium": {"shots": 0.0, "target": 0.0, "yellow": 0.0},
        "high": {"shots": 0.2, "target": -0.05, "yellow": 0.15}
    }
    return effects.get(tempo, effects["medium"])

def random_event():
    """Tilfeldig hendelse som kan påvirke kampen"""
    if not RANDOM_EVENTS or np.random.random() > 0.1:  # 10% sjanse
        return {"type": "none", "effect": 0.0}
    
    events = [
        {"type": "key_player_inspired", "effect": 0.3},
        {"type": "controversial_decision", "effect": -0.2},
        {"type": "crowd_boost", "effect": 0.15},
        {"type": "equipment_malfunction", "effect": -0.1}
    ]
    return np.random.choice(events)

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
    
    # Grunnleggende taktisk fit
    own_fit = tactical_fit(own_attrs, tactics_data[own_tactic]["requirements"])
    own_multiplier = get_tactical_multiplier(own_fit)
    
    opp_fit = tactical_fit(opp_attrs, tactics_data[opp_tactic]["requirements"])
    opp_multiplier = get_tactical_multiplier(opp_fit)
    
    # ====== ALLE MODIFIKATORER ======
    # Tilstand (moral, utmattelse, form)
    player_morale = PLAYER_MORALE if is_home else OPPONENT_MORALE
    player_fatigue = PLAYER_FATIGUE if is_home else OPPONENT_FATIGUE  
    player_form = PLAYER_FORM if is_home else OPPONENT_FORM
    condition_mult = get_condition_multiplier(player_morale, player_fatigue, player_form)
    
    # Hjemmebanefordel
    home_bonus = HOME_ADVANTAGE if is_home else 0.0
    
    # Væreffekter
    weather_effects = get_weather_effect(WEATHER)
    
    # Publikum (bare hjemme)
    crowd_bonus = get_crowd_effect(CROWD_SUPPORT, is_home)
    
    # Stadion
    stadium_effects = get_stadium_effect(STADIUM_SIZE)
    
    # Aggressivitet
    aggression_effects = get_aggression_effect(AGGRESSION_LEVEL)
    
    # Tempo
    tempo_effects = get_tempo_effect(TEMPO)
    
    # Tilfeldig hendelse
    event = random_event()
    event_bonus = event["effect"] if is_home else -event["effect"]/2
    
    # Hent grunneffekter
    own_effects = tactics_data[own_tactic]["own_effects"]
    opp_impact = tactics_data[opp_tactic]["opponent_effects"]
    
    # Sample grunnverdier
    base_shots = np.random.normal(raw_stats[f"{prefix}Shots"]["mean"], 
                                 raw_stats[f"{prefix}Shots"]["std"])
    
    # ====== BEREGN ALLE EFFEKTER ======
    # Skudd
    own_shot_bonus = own_effects["shots"] * own_multiplier
    opp_shot_penalty = opp_impact["shots"] * opp_multiplier
    shot_modifiers = (home_bonus + weather_effects["shots"] + crowd_bonus + 
                     aggression_effects["shots"] + tempo_effects["shots"] + 
                     event_bonus) * condition_mult
    
    total_shot_effect = own_shot_bonus + opp_shot_penalty + shot_modifiers
    shots = base_shots * (1 + total_shot_effect)
    shots = int(max(1, shots))
    
    # Skudd på mål
    base_accuracy = raw_stats[f"{prefix}Target"]["mean"] / raw_stats[f"{prefix}Shots"]["mean"]
    
    own_target_bonus = own_effects["target"] * own_multiplier
    opp_target_penalty = opp_impact["target"] * opp_multiplier
    target_modifiers = (weather_effects["target"] + tempo_effects.get("target", 0)) * condition_mult
    
    total_target_effect = own_target_bonus + opp_target_penalty + target_modifiers
    accuracy = base_accuracy * (1 + total_target_effect)
    target = min(shots, int(max(0, shots * max(0.1, accuracy))))
    
    # Mål
    own_goal_bonus = own_effects["goals"] * own_multiplier
    opp_goal_penalty = opp_impact["goals"] * opp_multiplier
    goal_modifiers = (weather_effects["goals"] + home_bonus/2) * condition_mult
    
    total_goal_effect = own_goal_bonus + opp_goal_penalty + goal_modifiers
    goal_rate = (0.4 + RISK_TAKING * 0.2) * (1 + total_goal_effect)
    goals = int(target * min(0.9, max(0.05, goal_rate)))
    
    # Kort
    base_yellow = np.random.normal(raw_stats[f"{prefix}Yellow"]["mean"],
                                  raw_stats[f"{prefix}Yellow"]["std"])
    yellow_effect = (aggression_effects["yellow"] + stadium_effects["yellow"] + 
                    tempo_effects.get("yellow", 0)) * condition_mult
    yellow = int(max(0, base_yellow * (1 + yellow_effect)))
    
    base_red = np.random.normal(raw_stats[f"{prefix}Red"]["mean"],
                               raw_stats[f"{prefix}Red"]["std"])
    red_effect = (aggression_effects["red"] + stadium_effects["red"]) * condition_mult
    red = int(max(0, base_red * (1 + red_effect)))
    
    return {
        "shots": shots, "target": target, "goals": goals,
        "yellow": yellow, "red": red,
        "fit": round(own_fit, 3), 
        "multiplier": round(own_multiplier, 3),
        "condition": round(condition_mult, 3),
        "event": event["type"]
    }

def simulate_match():
    home = simulate_team(PLAYER_ATTRS, PLAYER_TACTIC, OPPONENT_ATTRS, OPPONENT_TACTIC, is_home=True)
    away = simulate_team(OPPONENT_ATTRS, OPPONENT_TACTIC, PLAYER_ATTRS, PLAYER_TACTIC, is_home=False)
    
    print(f"🏟️  {STADIUM_SIZE.title()} stadium, {WEATHER} weather, {CROWD_SUPPORT} crowd support")
    print(f"⚡ Tempo: {TEMPO}, Aggression: {AGGRESSION_LEVEL}, Risk: {RISK_TAKING}")
    print(f"\nHome ({PLAYER_TACTIC}): fit={home['fit']}, condition={home['condition']}")
    print(f"Away ({OPPONENT_TACTIC}): fit={away['fit']}, condition={away['condition']}")
    
    if home['event'] != "none" or away['event'] != "none":
        print(f"📰 Events: Home={home['event']}, Away={away['event']}")
    
    return pd.DataFrame({
        "Home": [home["shots"], home["target"], home["goals"], home["yellow"], home["red"]],
        "Away": [away["shots"], away["target"], away["goals"], away["yellow"], away["red"]]
    }, index=["Shots", "Target", "Goals", "Yellow", "Red"])




# Kjør simulering
result = simulate_match()
print("\n=== KAMPRESULTAT ===")
print(result)