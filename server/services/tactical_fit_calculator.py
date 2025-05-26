"""
Simple tactical fit calculator based on task.txt specifications.
"""

import json
from pathlib import Path
from typing import Dict, Tuple

class TacticalFitCalculator:
    def __init__(self):
        """Initialize calculator with real-world match statistics."""
        self._load_match_statistics()
        self._load_tactical_effects()

    def _load_match_statistics(self):
        """Load real-world match statistics."""
        try:
            stats_path = Path(__file__).parent.parent / "data" / "match_statistics.json"
            with open(stats_path) as f:
                self.stats = json.load(f)
        except FileNotFoundError:
            print("Warning: match_statistics.json not found, using default values")
            self.stats = {
                "FTHome": {"mean": 1.49, "std": 1.26},
                "FTAway": {"mean": 1.15, "std": 1.11},
                "HomeShots": {"mean": 12.76, "std": 4.99},
                "AwayShots": {"mean": 10.41, "std": 4.45},
                "HomeTarget": {"mean": 5.12, "std": 2.77},
                "AwayTarget": {"mean": 4.14, "std": 2.43},
                "HomeFouls": {"mean": 12.62, "std": 4.48},
                "AwayFouls": {"mean": 13.08, "std": 4.55},
                "HomeCorners": {"mean": 5.67, "std": 2.94},
                "AwayCorners": {"mean": 4.62, "std": 2.62}
            }

    def _load_tactical_effects(self):
        """Load tactical effects from task.txt specifications."""
        self.tactical_effects = {
            "tiki-taka": {
                "home": {"shots": 0.08, "target": 0.10, "corners": 0.12, "fouls": -0.05},
                "away": {"shots": -0.10, "target": -0.12, "corners": -0.10, "fouls": -0.05}
            },
            "gegenpressing": {
                "home": {"shots": 0.15, "target": 0.18, "corners": 0.05, "fouls": 0.10},
                "away": {"shots": -0.15, "target": -0.15, "corners": -0.08, "fouls": 0.10}
            },
            "catenaccio": {
                "home": {"shots": -0.10, "target": -0.10, "corners": -0.15, "fouls": -0.10},
                "away": {"shots": -0.05, "target": -0.05, "corners": -0.10, "fouls": -0.02}
            },
            "total-football": {
                "home": {"shots": 0.12, "target": 0.12, "corners": 0.10, "fouls": 0.0},
                "away": {"shots": -0.10, "target": -0.10, "corners": -0.05, "fouls": 0.0}
            },
            "park-the-bus": {
                "home": {"shots": -0.12, "target": -0.10, "corners": -0.10, "fouls": -0.15},
                "away": {"shots": -0.05, "target": -0.05, "corners": -0.05, "fouls": -0.10}
            },
            "direct-play": {
                "home": {"shots": 0.20, "target": 0.15, "corners": 0.08, "fouls": 0.05},
                "away": {"shots": -0.02, "target": -0.02, "corners": -0.05, "fouls": 0.05}
            }
        }

    def calculate_tactical_fit(
        self,
        team_attributes: Dict[str, int],
        tactic: str
    ) -> float:
        """
        Calculate tactical fit score based on team attributes and chosen tactic.
        
        Args:
            team_attributes: Dictionary of team attributes (passing, shooting, etc.)
            tactic: The team's tactical approach
            
        Returns:
            Tactical fit score between 0 and 1
        """
        # Get required attributes for the tactic
        required_attrs = self._get_required_attributes(tactic)
        
        # Calculate average attribute score
        total_score = 0
        for attr, weight in required_attrs.items():
            team_value = team_attributes.get(attr, 50)  # Default to 50 if attribute missing
            total_score += (team_value / 100) * weight
        
        # Normalize to 0-1 range
        return total_score / sum(required_attrs.values())

    def _get_required_attributes(self, tactic: str) -> Dict[str, float]:
        """Get required attributes and their weights for each tactic."""
        # Convert tactic to lowercase for case-insensitive matching
        tactic = tactic.lower()
        
        tactics = {
            "tiki-taka": {
                "passing": 0.4,    # 90/100
                "dribbling": 0.3,  # 75/100
                "pace": 0.3        # 60/100
            },
            "gegenpressing": {
                "pace": 0.35,      # 85/100
                "defending": 0.35, # 80/100
                "physicality": 0.3 # 80/100
            },
            "catenaccio": {
                "defending": 0.45, # 95/100
                "physicality": 0.3, # 70/100
                "pace": 0.25      # 55/100
            },
            "total-football": {
                "passing": 0.33,   # 80/100
                "dribbling": 0.33, # 80/100
                "pace": 0.34       # 80/100
            },
            "park-the-bus": {
                "defending": 0.4,  # 90/100
                "physicality": 0.35, # 80/100
                "passing": 0.25    # 45/100
            },
            "direct-play": {
                "physicality": 0.35, # 85/100
                "shooting": 0.35,  # 75/100
                "pace": 0.3        # 70/100
            }
        }
        
        return tactics.get(tactic, {})

    def calculate_match_effects(
        self,
        home_tfs: float,
        away_tfs: float,
        home_tactic: str,
        away_tactic: str
    ) -> Tuple[Dict[str, float], Dict[str, float]]:
        """
        Calculate match effects based on tactical fit scores and real statistics.
        
        Args:
            home_tfs: Home team's tactical fit score
            away_tfs: Away team's tactical fit score
            home_tactic: Home team's tactic
            away_tactic: Away team's tactic
            
        Returns:
            Tuple of (home_effects, away_effects) dictionaries
        """
        # Get base effects from tactical fit scores
        home_base_effects = self._calculate_team_effects(home_tfs)
        away_base_effects = self._calculate_team_effects(away_tfs)
        
        # Get tactical effects
        home_tactical = self.tactical_effects.get(home_tactic.lower(), {}).get("home", {})
        away_tactical = self.tactical_effects.get(away_tactic.lower(), {}).get("away", {})
        
        # Calculate final effects
        home_effects = {
            "positive_effect": home_base_effects["positive_effect"],
            "negative_effect": home_base_effects["negative_effect"],
            "penalty": home_base_effects["penalty"],
            "shots": self.stats["HomeShots"]["mean"] * (1 + home_tactical.get("shots", 0)),
            "target": self.stats["HomeTarget"]["mean"] * (1 + home_tactical.get("target", 0)),
            "corners": self.stats["HomeCorners"]["mean"] * (1 + home_tactical.get("corners", 0)),
            "fouls": self.stats["HomeFouls"]["mean"] * (1 + home_tactical.get("fouls", 0))
        }
        
        away_effects = {
            "positive_effect": away_base_effects["positive_effect"],
            "negative_effect": away_base_effects["negative_effect"],
            "penalty": away_base_effects["penalty"],
            "shots": self.stats["AwayShots"]["mean"] * (1 + away_tactical.get("shots", 0)),
            "target": self.stats["AwayTarget"]["mean"] * (1 + away_tactical.get("target", 0)),
            "corners": self.stats["AwayCorners"]["mean"] * (1 + away_tactical.get("corners", 0)),
            "fouls": self.stats["AwayFouls"]["mean"] * (1 + away_tactical.get("fouls", 0))
        }
        
        # Calculate goal probabilities
        home_shot_conv = home_effects["target"] / home_effects["shots"]
        away_shot_conv = away_effects["target"] / away_effects["shots"]
        
        # Base probability is shots per game / 90 minutes * conversion rate
        home_base_prob = (home_effects["shots"] / 90) * home_shot_conv
        away_base_prob = (away_effects["shots"] / 90) * away_shot_conv
        
        # Apply tactical effects
        home_effects["goal_probability"] = home_base_prob * (1 + home_effects["positive_effect"]) * (1 + away_effects["penalty"])
        away_effects["goal_probability"] = away_base_prob * (1 + away_effects["positive_effect"]) * (1 - home_effects["penalty"])
        
        return home_effects, away_effects

    def _calculate_team_effects(self, tfs: float) -> Dict[str, float]:
        """Calculate effects for a team based on their tactical fit score."""
        effects = {
            "positive_effect": 0.0,  # Effect on own team
            "negative_effect": 0.0,  # Effect on opponent
            "penalty": 0.0           # Negative penalty on own team
        }
        
        if tfs >= 0.80:
            effects["positive_effect"] = 1.0
            effects["negative_effect"] = 1.0
            effects["penalty"] = 0.0
        elif 0.50 <= tfs < 0.79:
            # Linear scaling
            scale = (tfs - 0.5) / 0.3
            effects["positive_effect"] = scale
            effects["negative_effect"] = scale
            effects["penalty"] = 0.0
        elif 0.40 <= tfs < 0.49:
            effects["positive_effect"] = 0.0
            effects["negative_effect"] = 0.0
            effects["penalty"] = (0.5 - tfs) / 0.1
        else:  # tfs < 0.40
            effects["positive_effect"] = 0.0
            effects["negative_effect"] = 0.0
            effects["penalty"] = 1.0
            
        return effects 