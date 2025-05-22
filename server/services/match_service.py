"""
Real-life–shaped football-match simulator.

• Reads per-match averages (goals, yellows, reds) from the
  "match_statistics.json" file.
• Uses those numbers as Poisson parameters for each new MatchService instance.
• Streams JSON lines identical to your original interface.
• Optional GPT commentary (set use_llm=True).
"""

import asyncio, json, random
from pathlib import Path
from typing import List, Dict, Any, AsyncGenerator, Optional

import numpy as np
import pandas as pd

try:                                   # Optional dependency for nicer text
    from langchain_openai import ChatOpenAI
except ImportError:
    ChatOpenAI = None


# ──────────────────────────────────────────────────────────────────────────
#  Dataset reader
# ──────────────────────────────────────────────────────────────────────────
class MatchStats:
    """
    Load match statistics from JSON file and expose league-wide means.
    """

    def __init__(self, json_path: str | Path):
        path = Path(json_path)
        if not path.exists():
            raise FileNotFoundError(path)
        
        with open(path) as f:
            stats = json.load(f)

        # per-team, per-match averages
        self.lambda_home_goals = stats["FTHome"]["mean"]
        self.lambda_away_goals = stats["FTAway"]["mean"]
        self.lambda_home_yel   = stats["HomeYellow"]["mean"]
        self.lambda_away_yel   = stats["AwayYellow"]["mean"]
        self.lambda_home_shots = stats["HomeShots"]["mean"]
        self.lambda_away_shots = stats["AwayShots"]["mean"]
        self.lambda_home_sot   = stats["HomeTarget"]["mean"]
        self.lambda_away_sot   = stats["AwayTarget"]["mean"]
        self.lambda_home_fouls = stats["HomeFouls"]["mean"]
        self.lambda_away_fouls = stats["AwayFouls"]["mean"]
        self.lambda_home_corners = stats["HomeCorners"]["mean"]
        self.lambda_away_corners = stats["AwayCorners"]["mean"]

        # Calculate possession based on shots and corners (as a proxy)
        total_home_actions = stats["HomeShots"]["mean"] + stats["HomeCorners"]["mean"]
        total_away_actions = stats["AwayShots"]["mean"] + stats["AwayCorners"]["mean"]
        total_actions = total_home_actions + total_away_actions
        self.lambda_home_poss = (total_home_actions / total_actions) * 100
        self.lambda_away_poss = (total_away_actions / total_actions) * 100

        # Calculate red card probability after yellow
        total_yel = stats["HomeYellow"]["mean"] + stats["AwayYellow"]["mean"]
        total_red = stats["HomeRed"]["mean"] + stats["AwayRed"]["mean"]
        self.prob_red_after_yel = total_red / total_yel if total_yel else 0.05

        # Store standard deviations for more realistic variation
        self.std_home_goals = stats["FTHome"]["std"]
        self.std_away_goals = stats["FTAway"]["std"]
        self.std_home_shots = stats["HomeShots"]["std"]
        self.std_away_shots = stats["AwayShots"]["std"]
        self.std_home_sot = stats["HomeTarget"]["std"]
        self.std_away_sot = stats["AwayTarget"]["std"]
        self.std_home_fouls = stats["HomeFouls"]["std"]
        self.std_away_fouls = stats["AwayFouls"]["std"]
        self.std_home_corners = stats["HomeCorners"]["std"]
        self.std_away_corners = stats["AwayCorners"]["std"]


# ──────────────────────────────────────────────────────────────────────────
#  Live-match generator
# ──────────────────────────────────────────────────────────────────────────
class MatchService:
    # default fall-back parameters (used if no MatchStats supplied)
    GOALS_LAMBDA_HOME = 1.4
    GOALS_LAMBDA_AWAY = 1.1
    YELLOW_LAMBDA_HOME = 2.5
    YELLOW_LAMBDA_AWAY = 2.5
    RED_PROB_AFTER_YELLOW = 0.06
    SUBS_PER_TEAM = 3
    EXTRA_MINUTES = (1, 6)       # added time per half

    # Default stats parameters
    POSSESSION_HOME = 52
    POSSESSION_AWAY = 48
    SHOTS_HOME = 12
    SHOTS_AWAY = 10
    SHOTS_ON_TARGET_HOME = 5
    SHOTS_ON_TARGET_AWAY = 4
    PASSES_HOME = 450
    PASSES_AWAY = 400
    PASS_ACCURACY_HOME = 85
    PASS_ACCURACY_AWAY = 82
    FOULS_HOME = 8
    FOULS_AWAY = 9
    CORNERS_HOME = 6  # Default corners per match
    CORNERS_AWAY = 5  # Default corners per match

    GOAL_MINUTE_WEIGHTS = [1 if m < 75 else 1.4 for m in range(1, 91)]
    YEL_MINUTE_WEIGHTS  = [1 if m < 60 else 1.3 for m in range(1, 91)]

    # ───────────────────────────────────────────────────────
    def __init__(
        self,
        home_team: str,
        away_team: str,
        *,
        seed: Optional[int] = None,
        stats_backend: Optional[MatchStats] = None,
        use_llm: bool = False,
        llm_temperature: float = 0.7,
        debug_mode: bool = False,
        home_team_attributes: Optional[Dict[str, int]] = None,
        away_team_attributes: Optional[Dict[str, int]] = None,
        home_team_tactic: Optional[str] = None,
        away_team_tactic: Optional[str] = None,
        home_team_formation: Optional[str] = None,
        away_team_formation: Optional[str] = None,
        home_team_stats: Optional[Dict[str, Any]] = None,
        away_team_stats: Optional[Dict[str, Any]] = None,
    ):
        self.home_team = home_team
        self.away_team = away_team
        self.debug_mode = debug_mode
        self.chunk_size = 15  # minutes per chunk
        self.event_delay = 0.5  # seconds between events

        # Store team attributes and tactics
        self.home_team_attributes = home_team_attributes or {}
        self.away_team_attributes = away_team_attributes or {}
        self.home_team_tactic = home_team_tactic or "Balanced"
        self.away_team_tactic = away_team_tactic or "Balanced"
        self.home_team_formation = home_team_formation or "4-3-3"
        self.away_team_formation = away_team_formation or "4-3-3"
        self.home_team_stats = home_team_stats or {}
        self.away_team_stats = away_team_stats or {}

        # RNGs
        self._rng = random.Random(seed)
        self._np_rng = np.random.default_rng(seed)

        # Override parameters if dataset supplied
        if stats_backend:
            self._apply_stats_backend(stats_backend)
        else:
            # Adjust parameters based on team attributes
            self._adjust_parameters_from_attributes()

        # Optional GPT commentator
        self.llm = (
            ChatOpenAI(model_name="gpt-4", temperature=llm_temperature)
            if use_llm and ChatOpenAI and not debug_mode
            else None
        )

        # State
        self._events: List[Dict[str, Any]] = []
        self._generated = False
        self._is_half_time = False
        self._current_score = {"home": 0, "away": 0}
        self._stats = self._initialize_stats()

    def _adjust_parameters_from_attributes(self) -> None:
        """Adjust match parameters based on team attributes."""
        print("\n=== Adjusting Match Parameters ===")
        print(f"Home Team: {self.home_team}")
        print(f"Home Tactic: {self.home_team_tactic}")
        print(f"Home Formation: {self.home_team_formation}")
        
        # Adjust goal probabilities based on shooting and passing
        home_shooting = self.home_team_attributes.get("shooting", 50)
        home_passing = self.home_team_attributes.get("passing", 50)
        away_shooting = self.away_team_attributes.get("shooting", 50)
        away_passing = self.away_team_attributes.get("passing", 50)

        print(f"\nTeam Attributes:")
        print(f"Home Shooting: {home_shooting}")
        print(f"Home Passing: {home_passing}")
        print(f"Away Shooting: {away_shooting}")
        print(f"Away Passing: {away_passing}")

        # Base adjustment factor (0.8 to 1.2 range)
        home_factor = (home_shooting + home_passing) / 100
        away_factor = (away_shooting + away_passing) / 100

        print(f"\nBase Factors:")
        print(f"Home Factor: {home_factor}")
        print(f"Away Factor: {away_factor}")

        # Adjust goal probabilities
        self.GOALS_LAMBDA_HOME *= home_factor
        self.GOALS_LAMBDA_AWAY *= away_factor

        # Adjust possession based on passing and tactic
        home_passing_skill = home_passing / 100
        away_passing_skill = away_passing / 100

        # Tactic adjustments
        tactic_adjustments = {
            "Possession-Based": 1.2,
            "Balanced": 1.0,
            "Counter-Attacking": 0.8,
            "Defensive": 0.7,
            "Offensive": 1.1,
            "Aggressive": 1.1
        }

        home_tactic_factor = tactic_adjustments.get(self.home_team_tactic, 1.0)
        away_tactic_factor = tactic_adjustments.get(self.away_team_tactic, 1.0)

        print(f"\nTactic Factors:")
        print(f"Home Tactic Factor: {home_tactic_factor}")
        print(f"Away Tactic Factor: {away_tactic_factor}")

        # Calculate possession
        total_skill = home_passing_skill * home_tactic_factor + away_passing_skill * away_tactic_factor
        self.POSSESSION_HOME = (home_passing_skill * home_tactic_factor / total_skill) * 100
        self.POSSESSION_AWAY = 100 - self.POSSESSION_HOME

        # Adjust shots based on shooting and tactic
        self.SHOTS_HOME = int(12 * home_factor * home_tactic_factor)
        self.SHOTS_AWAY = int(12 * away_factor * away_tactic_factor)

        # Adjust shots on target based on shooting
        self.SHOTS_ON_TARGET_HOME = int(self.SHOTS_HOME * (home_shooting / 100))
        self.SHOTS_ON_TARGET_AWAY = int(self.SHOTS_AWAY * (away_shooting / 100))

        # Adjust passes based on passing skill
        self.PASSES_HOME = int(450 * home_passing_skill)
        self.PASSES_AWAY = int(450 * away_passing_skill)

        # Adjust pass accuracy based on passing skill
        self.PASS_ACCURACY_HOME = int(70 + (home_passing_skill * 20))
        self.PASS_ACCURACY_AWAY = int(70 + (away_passing_skill * 20))

        # Adjust fouls based on physicality
        home_physicality = self.home_team_attributes.get("physicality", 50)
        away_physicality = self.away_team_attributes.get("physicality", 50)
        self.FOULS_HOME = int(8 * (home_physicality / 50))
        self.FOULS_AWAY = int(8 * (away_physicality / 50))

        # Adjust corners based on attacking play
        self.CORNERS_HOME = int(6 * home_factor)
        self.CORNERS_AWAY = int(6 * away_factor)

        print(f"\nFinal Parameters:")
        print(f"Goals Lambda Home: {self.GOALS_LAMBDA_HOME}")
        print(f"Possession Home: {self.POSSESSION_HOME}")
        print(f"Shots Home: {self.SHOTS_HOME}")
        print(f"Shots On Target Home: {self.SHOTS_ON_TARGET_HOME}")
        print(f"Passes Home: {self.PASSES_HOME}")
        print(f"Pass Accuracy Home: {self.PASS_ACCURACY_HOME}")
        print(f"Fouls Home: {self.FOULS_HOME}")
        print(f"Corners Home: {self.CORNERS_HOME}")

    def _initialize_stats(self) -> Dict[str, Any]:
        """Initialize match statistics structure."""
        return {
            "home": {
                "possession": 0,
                "shots": 0,
                "shotsOnTarget": 0,
                "fouls": 0,
                "corners": 0,
            },
            "away": {
                "possession": 0,
                "shots": 0,
                "shotsOnTarget": 0,
                "fouls": 0,
                "corners": 0,
            }
        }

    def _apply_stats_backend(self, stats_backend: MatchStats) -> None:
        """Apply statistics from the backend."""
        self.GOALS_LAMBDA_HOME = stats_backend.lambda_home_goals
        self.GOALS_LAMBDA_AWAY = stats_backend.lambda_away_goals
        self.YELLOW_LAMBDA_HOME = stats_backend.lambda_home_yel
        self.YELLOW_LAMBDA_AWAY = stats_backend.lambda_away_yel
        self.RED_PROB_AFTER_YELLOW = stats_backend.prob_red_after_yel
        self.POSSESSION_HOME = stats_backend.lambda_home_poss
        self.POSSESSION_AWAY = stats_backend.lambda_away_poss
        self.SHOTS_HOME = stats_backend.lambda_home_shots
        self.SHOTS_AWAY = stats_backend.lambda_away_shots
        self.SHOTS_ON_TARGET_HOME = stats_backend.lambda_home_sot
        self.SHOTS_ON_TARGET_AWAY = stats_backend.lambda_away_sot
        self.CORNERS_HOME = stats_backend.lambda_home_corners
        self.CORNERS_AWAY = stats_backend.lambda_away_corners
        self.FOULS_HOME = stats_backend.lambda_home_fouls
        self.FOULS_AWAY = stats_backend.lambda_away_fouls

    # ───────────────────────── STREAMING API ────────────────────────────
    async def stream_first_half(self) -> AsyncGenerator[str, None]:
        """Generate and stream all first half events at once."""
        if not self._generated:
            self._events = []
            # Generate all events for first half
            first_half_events = self._generate_timeline_chunk(0, 45)
            self._events.extend(first_half_events)
            self._generated = True

        # Stream all first half events with minute updates
        current_minute = 0
        for ev in self._events:
            if ev["minute"] > 45:
                break
                
            # Stream minutes up to the next event
            while current_minute < ev["minute"]:
                current_minute += 1
                # Send a simple minute update without creating an event
                minute_update = {
                    "minute": current_minute,
                    "type": "minute_update",
                    "score": self._current_score.copy(),
                    "stats": self._stats
                }
                yield json.dumps(minute_update) + "\n"
                await asyncio.sleep(0.5)  # Small delay between minutes
            
            # Stream the actual event
            yield await self._process_event(ev)

        # Set half-time state
        self._is_half_time = True

    async def stream_second_half(self) -> AsyncGenerator[str, None]:
        """Generate and stream all second half events at once."""
        if not self._is_half_time:
            raise RuntimeError("Second half requested before half-time.")

        # Generate all events for second half
        second_half_events = self._generate_timeline_chunk(45, 90)
        self._events.extend(second_half_events)

        # Stream all second half events with minute updates
        current_minute = 45
        for ev in second_half_events:
            # Stream minutes up to the next event
            while current_minute < ev["minute"]:
                current_minute += 1
                # Send a simple minute update without creating an event
                minute_update = {
                    "minute": current_minute,
                    "type": "minute_update",
                    "score": self._current_score.copy(),
                    "stats": self._stats
                }
                yield json.dumps(minute_update) + "\n"
                await asyncio.sleep(0.5)  # Small delay between minutes
            
            # Stream the actual event
            yield await self._process_event(ev)

    async def _process_event(self, event: Dict[str, Any]) -> str:
        """Process a single event and return its JSON representation."""
        try:
            self._update_stats(event)
            event["stats"] = self._stats
            await asyncio.sleep(self.event_delay)  # Keep a small delay for readability
            return json.dumps(event) + "\n"
        except Exception as e:
            print(f"Error processing event: {e}")
            return ""

    # ───────────────────────── TIMELINE BUILD ───────────────────────────
    def _generate_timeline(self) -> None:
        if self.debug_mode:
            self._generate_debug_timeline()
            return

        raw = (
            self._simulate_goals() +
            self._simulate_yellows_reds() +
            self._simulate_substitutions() +
            self._static_markers()
        )
        raw.sort(key=lambda e: e["minute"])

        # running score + commentary
        home, away = 0, 0
        for ev in raw:
            if ev["event"]["type"] == "goal":
                if ev["event"]["team"] == "home":
                    home += 1
                elif ev["event"]["team"] == "away":
                    away += 1
            ev["score"] = {"home": home, "away": away}
            ev["event"]["description"] = self._describe(ev)

        self._events = raw
        self._generated = True

    def _generate_debug_timeline(self) -> None:
        """Generate a fixed sequence of events for testing."""
        events = [
            self._event(5, "home", "goal", description=f"GOAL! {self.home_team} score!"),
            self._event(15, "away", "yellow_card", description=f"Yellow card for {self.away_team}."),
            self._event(25, "home", "goal", description=f"GOAL! {self.home_team} score!"),
            self._event(35, "away", "goal", description=f"GOAL! {self.away_team} score!"),
            self._event(45, "info", "half-time", description="Half-time whistle."),
            self._event(55, "home", "substitution", description=f"{self.home_team} make a substitution."),
            self._event(65, "away", "yellow_card", description=f"Yellow card for {self.away_team}."),
            self._event(75, "home", "goal", description=f"GOAL! {self.home_team} score!"),
            self._event(85, "away", "goal", description=f"GOAL! {self.away_team} score!"),
            self._event(90, "info", "full-time", description="Full-time, all over!"),
        ]

        # Add basic descriptions and stats
        home, away = 0, 0
        for ev in events:
            if ev["event"]["type"] == "goal":
                if ev["event"]["team"] == "home":
                    home += 1
                elif ev["event"]["team"] == "away":
                    away += 1
            ev["score"] = {"home": home, "away": away}
            self._update_stats(ev)
            ev["stats"] = self._stats

        self._events = events
        self._generated = True

    # ───────────────────────── STATS SIMULATION ─────────────────────────
    def _update_stats(self, event: Dict[str, Any]) -> None:
        """Update match statistics based on the current event."""
        minute = event["minute"]
        progress = minute / 90

        # Update possession with slight random variation
        self._stats["home"]["possession"] = self.POSSESSION_HOME + self._rng.uniform(-2, 2)
        self._stats["away"]["possession"] = 100 - self._stats["home"]["possession"]

        # Update shots and shots on target
        if event["event"]["type"] == "goal":
            team = event["event"]["team"]
            self._stats[team]["shots"] += 1
            self._stats[team]["shotsOnTarget"] += 1
            self._current_score[team] += 1
        elif event["event"]["type"] == "yellow_card":
            team = event["event"]["team"]
            self._stats[team]["yellowCards"] = self._stats[team].get("yellowCards", 0) + 1
        elif event["event"]["type"] == "red_card":
            team = event["event"]["team"]
            self._stats[team]["redCards"] = self._stats[team].get("redCards", 0) + 1
        else:
            self._update_progressive_stats(progress)

        # Ensure values are within realistic ranges
        self._normalize_stats()

    def _update_progressive_stats(self, progress: float) -> None:
        """Update statistics that progress with match time."""
        if hasattr(self, 'stats_backend') and self.stats_backend:
            # Use normal distribution with mean and std from stats
            self._stats["home"]["shots"] = int(max(0, self._np_rng.normal(
                self.SHOTS_HOME * progress,
                self.stats_backend.std_home_shots * progress
            )))
            self._stats["away"]["shots"] = int(max(0, self._np_rng.normal(
                self.SHOTS_AWAY * progress,
                self.stats_backend.std_away_shots * progress
            )))
            self._stats["home"]["shotsOnTarget"] = int(max(0, self._np_rng.normal(
                self.SHOTS_ON_TARGET_HOME * progress,
                self.stats_backend.std_home_sot * progress
            )))
            self._stats["away"]["shotsOnTarget"] = int(max(0, self._np_rng.normal(
                self.SHOTS_ON_TARGET_AWAY * progress,
                self.stats_backend.std_away_sot * progress
            )))
            self._stats["home"]["corners"] = int(max(0, self._np_rng.normal(
                self.CORNERS_HOME * progress,
                self.stats_backend.std_home_corners * progress
            )))
            self._stats["away"]["corners"] = int(max(0, self._np_rng.normal(
                self.CORNERS_AWAY * progress,
                self.stats_backend.std_away_corners * progress
            )))
            self._stats["home"]["fouls"] = int(max(0, self._np_rng.normal(
                self.FOULS_HOME * progress,
                self.stats_backend.std_home_fouls * progress
            )))
            self._stats["away"]["fouls"] = int(max(0, self._np_rng.normal(
                self.FOULS_AWAY * progress,
                self.stats_backend.std_away_fouls * progress
            )))
        else:
            # Fallback to simple linear progression
            self._stats["home"]["shots"] = int(self.SHOTS_HOME * progress)
            self._stats["away"]["shots"] = int(self.SHOTS_AWAY * progress)
            self._stats["home"]["shotsOnTarget"] = int(self.SHOTS_ON_TARGET_HOME * progress)
            self._stats["away"]["shotsOnTarget"] = int(self.SHOTS_ON_TARGET_AWAY * progress)
            self._stats["home"]["corners"] = int(self.CORNERS_HOME * progress)
            self._stats["away"]["corners"] = int(self.CORNERS_AWAY * progress)
            self._stats["home"]["fouls"] = int(self.FOULS_HOME * progress)
            self._stats["away"]["fouls"] = int(self.FOULS_AWAY * progress)

    def _normalize_stats(self) -> None:
        """Ensure all statistics are within realistic ranges."""
        self._stats["home"]["possession"] = max(0, min(100, self._stats["home"]["possession"]))
        self._stats["away"]["possession"] = max(0, min(100, self._stats["away"]["possession"]))
        for team in ["home", "away"]:
            self._stats[team]["shotsOnTarget"] = min(
                self._stats[team]["shotsOnTarget"],
                self._stats[team]["shots"]
            )

    # ───────────────────────── SIMULATORS ───────────────────────────────
    def _simulate_goals(self) -> List[Dict[str, Any]]:
        events = []
        nh = int(self._np_rng.poisson(self.GOALS_LAMBDA_HOME))
        na = int(self._np_rng.poisson(self.GOALS_LAMBDA_AWAY))

        minutes = list(range(1, 91))
        for _ in range(nh):
            m = self._rng.choices(minutes, weights=self.GOAL_MINUTE_WEIGHTS, k=1)[0]
            events.append(self._event(m, "home", "goal"))
        for _ in range(na):
            m = self._rng.choices(minutes, weights=self.GOAL_MINUTE_WEIGHTS, k=1)[0]
            events.append(self._event(m, "away", "goal"))
        return events

    def _simulate_yellows_reds(self) -> List[Dict[str, Any]]:
        events = []
        for team, lam in (("home", self.YELLOW_LAMBDA_HOME),
                          ("away", self.YELLOW_LAMBDA_AWAY)):
            ny = int(self._np_rng.poisson(lam))
            for _ in range(ny):
                m = self._rng.choices(
                    list(range(1, 91)), weights=self.YEL_MINUTE_WEIGHTS, k=1
                )[0]
                events.append(self._event(m, team, "yellow_card"))
                if self._rng.random() < self.RED_PROB_AFTER_YELLOW:
                    red_min = self._rng.randint(m + 1, min(m + 25, 90))
                    events.append(self._event(red_min, team, "red_card"))
        return events

    def _simulate_substitutions(self) -> List[Dict[str, Any]]:
        events = []
        for team in ("home", "away"):
            for _ in range(self.SUBS_PER_TEAM):
                m = self._rng.randint(46, 75)
                events.append(self._event(m, team, "substitution"))
        return events

    def _static_markers(self) -> List[Dict[str, Any]]:
        extra = self._rng.randint(*self.EXTRA_MINUTES)
        return [
            self._event(45, "info", "half-time"),
            self._event(90 + extra, "info", "full-time"),
        ]

    # ───────────────────────── UTILITIES ────────────────────────────────
    @staticmethod
    def _event(minute: int, team: str, etype: str, description: str = "") -> Dict[str, Any]:
        return {
            "minute": minute,
            "event": {
                "team": team,
                "type": etype,
                "description": description
            },
            "score": {"home": 0, "away": 0}  # Will be updated in _generate_timeline
        }

    def _describe(self, ev: Dict[str, Any]) -> str:
        etype = ev["event"]["type"]
        team_name = (
            self.home_team if ev["event"]["team"] == "home"
            else self.away_team if ev["event"]["team"] == "away"
            else ""
        )

        # Generate formal description
        formal = {
            "goal":         f"Goal scored by {team_name}.",
            "yellow_card":  f"Yellow card shown to {team_name} player.",
            "red_card":     f"Red card shown to {team_name} player.",
            "substitution": f"Substitution made by {team_name}.",
            "half-time":    "Half-time whistle blown.",
            "full-time":    "Full-time whistle blown.",
        }[etype]

        # Set the formal description
        ev["event"]["description"] = formal

        # Always generate commentary for significant events
        if etype in ["goal", "red_card", "half-time", "full-time"]:
            if self.llm:
                prompt = (
                    "You are a passionate British football commentator. "
                    "Generate an exciting, dramatic commentary for this match event. "
                    "Rules:\n"
                    "1. Use typical British football commentary phrases\n"
                    "2. Be dramatic and emotional\n"
                    "3. Include crowd reactions\n"
                    "4. Keep it concise (1-2 sentences)\n"
                    "5. No emojis or special characters\n"
                    f"Event: {etype}\n"
                    f"Team: {team_name}\n"
                    f"Score: {ev['score']['home']}–{ev['score']['away']}\n"
                    "Return only the commentary line."
                )
                try:
                    commentary = self.llm.invoke(prompt).content.strip()
                except Exception:
                    commentary = self._get_default_commentary(etype, team_name)
            else:
                commentary = self._get_default_commentary(etype, team_name)
            
            ev["event"]["commentary"] = commentary
        else:
            # Add default commentary for other events too
            ev["event"]["commentary"] = self._get_default_commentary(etype, team_name)

        return formal  # Return formal description for backward compatibility

    def _get_default_commentary(self, etype: str, team_name: str) -> str:
        """Get default commentary when LLM is not available."""
        return {
            "goal":         f"GOOOOOAL! {team_name} have done it! The crowd goes absolutely wild!",
            "yellow_card":  f"Yellow card! The referee has his book out for {team_name}!",
            "red_card":     f"RED CARD! RED CARD! {team_name} are down to 10 men! This could change everything!",
            "substitution": f"Here comes a substitution for {team_name}. A tactical change perhaps?",
            "half-time":    f"And that's the end of the first half! What a 45 minutes of football we've witnessed!",
            "full-time":    f"FULL TIME! What a match we've witnessed! The crowd are on their feet!",
        }[etype]

    def _generate_timeline_chunk(self, start_min: int, end_min: int) -> List[Dict[str, Any]]:
        """Generate all events for a specific time period."""
        if self.debug_mode:
            return self._generate_debug_timeline_chunk(start_min, end_min)

        raw = (
            self._simulate_goals_chunk(start_min, end_min) +
            self._simulate_yellows_reds_chunk(start_min, end_min) +
            self._simulate_substitutions_chunk(start_min, end_min)
        )

        # Add static markers if they fall within this chunk
        if start_min <= 45 <= end_min:
            raw.append(self._event(45, "info", "half-time"))
        if start_min <= 90 <= end_min:
            extra = self._rng.randint(*self.EXTRA_MINUTES)
            raw.append(self._event(90 + extra, "info", "full-time"))

        raw.sort(key=lambda e: e["minute"])

        # Update scores and add descriptions
        for ev in raw:
            if ev["event"]["type"] == "goal":
                team = ev["event"]["team"]
                self._current_score[team] += 1
            ev["score"] = self._current_score.copy()
            
            # Add commentary for all events
            team_name = self.home_team if ev["event"]["team"] == "home" else self.away_team
            try:
                if self.llm:
                    prompt = (
                        "You are a passionate British football commentator. "
                        "Generate an exciting, dramatic commentary for this match event. "
                        "Rules:\n"
                        "1. Use typical British football commentary phrases\n"
                        "2. Be dramatic and emotional\n"
                        "3. Include crowd reactions\n"
                        "4. Keep it concise (1-2 sentences)\n"
                        "5. No emojis or special characters\n"
                        f"Event: {ev['event']['type']}\n"
                        f"Team: {team_name}\n"
                        f"Score: {ev['score']['home']}–{ev['score']['away']}\n"
                        "Return only the commentary line."
                    )
                    try:
                        commentary = self.llm.invoke(prompt).content.strip()
                        ev["event"]["commentary"] = commentary
                    except Exception as e:
                        print(f"Error generating LLM commentary: {e}")
                        ev["event"]["commentary"] = self._get_default_commentary(ev["event"]["type"], team_name)
                else:
                    ev["event"]["commentary"] = self._get_default_commentary(ev["event"]["type"], team_name)
            except Exception as e:
                print(f"Error in commentary generation: {e}")
                ev["event"]["commentary"] = self._get_default_commentary(ev["event"]["type"], team_name)
            
            ev["event"]["description"] = self._describe(ev)

        return raw

    def _simulate_goals_chunk(self, start_min: int, end_min: int) -> List[Dict[str, Any]]:
        """Simulate goals for a specific time chunk."""
        events = []
        # Adjust lambda based on chunk size and add some randomness
        chunk_size = end_min - start_min
        chunk_ratio = chunk_size / 90

        # Use normal distribution with mean and std from stats
        if hasattr(self, 'stats_backend') and self.stats_backend:
            nh = int(max(0, self._np_rng.normal(
                self.GOALS_LAMBDA_HOME * chunk_ratio,
                self.stats_backend.std_home_goals * chunk_ratio
            )))
            na = int(max(0, self._np_rng.normal(
                self.GOALS_LAMBDA_AWAY * chunk_ratio,
                self.stats_backend.std_away_goals * chunk_ratio
            )))
        else:
            nh = int(self._np_rng.poisson(self.GOALS_LAMBDA_HOME * chunk_ratio))
            na = int(self._np_rng.poisson(self.GOALS_LAMBDA_AWAY * chunk_ratio))

        minutes = list(range(start_min + 1, end_min + 1))
        weights = self.GOAL_MINUTE_WEIGHTS[start_min:end_min]
        
        for _ in range(nh):
            m = self._rng.choices(minutes, weights=weights, k=1)[0]
            events.append(self._event(m, "home", "goal"))
        for _ in range(na):
            m = self._rng.choices(minutes, weights=weights, k=1)[0]
            events.append(self._event(m, "away", "goal"))
        return events

    def _simulate_yellows_reds_chunk(self, start_min: int, end_min: int) -> List[Dict[str, Any]]:
        """Simulate cards for a specific time chunk."""
        events = []
        chunk_size = end_min - start_min
        for team, lam in (("home", self.YELLOW_LAMBDA_HOME),
                         ("away", self.YELLOW_LAMBDA_AWAY)):
            ny = int(self._np_rng.poisson(lam * (chunk_size / 90)))
            for _ in range(ny):
                m = self._rng.choices(
                    list(range(start_min + 1, end_min + 1)),
                    weights=self.YEL_MINUTE_WEIGHTS[start_min:end_min],
                    k=1
                )[0]
                events.append(self._event(m, team, "yellow_card"))
                if self._rng.random() < self.RED_PROB_AFTER_YELLOW:
                    red_min = self._rng.randint(m + 1, min(m + 25, end_min))
                    events.append(self._event(red_min, team, "red_card"))
        return events

    def _simulate_substitutions_chunk(self, start_min: int, end_min: int) -> List[Dict[str, Any]]:
        """Simulate substitutions for a specific time chunk."""
        events = []
        for team in ("home", "away"):
            # Distribute substitutions across chunks
            subs_in_chunk = max(0, min(1, self.SUBS_PER_TEAM - len([e for e in self._events if e["event"]["type"] == "substitution" and e["event"]["team"] == team])))
            for _ in range(subs_in_chunk):
                m = self._rng.randint(start_min + 1, end_min)
                events.append(self._event(m, team, "substitution"))
        return events

    def _generate_debug_timeline_chunk(self, start_min: int, end_min: int) -> List[Dict[str, Any]]:
        """Generate debug events for a specific time chunk."""
        debug_events = [
            # First Half
            self._event(2, "home", "yellow_card", description=f"Early yellow card for {self.home_team}."),
            self._event(5, "home", "goal", description=f"GOAL! {self.home_team} take an early lead!"),
            self._event(12, "away", "yellow_card", description=f"Yellow card for {self.away_team}."),
            self._event(15, "away", "goal", description=f"GOAL! {self.away_team} equalize!"),
            self._event(18, "home", "substitution", description=f"{self.home_team} make their first substitution."),
            self._event(25, "home", "goal", description=f"GOAL! {self.home_team} regain the lead!"),
            self._event(28, "away", "yellow_card", description=f"Another yellow card for {self.away_team}."),
            self._event(32, "home", "yellow_card", description=f"Yellow card for {self.home_team}."),
            self._event(35, "away", "goal", description=f"GOAL! {self.away_team} level the score again!"),
            self._event(38, "away", "red_card", description=f"RED CARD! {self.away_team} are down to 10 men!"),
            self._event(42, "home", "goal", description=f"GOAL! {self.home_team} take advantage of the extra man!"),
            self._event(45, "info", "half-time", description="Half-time whistle."),
            
            # Second Half
            self._event(48, "away", "substitution", description=f"{self.away_team} make a tactical change."),
            self._event(52, "home", "yellow_card", description=f"Yellow card for {self.home_team}."),
            self._event(55, "home", "substitution", description=f"{self.home_team} make their second substitution."),
            self._event(58, "away", "yellow_card", description=f"Yellow card for {self.away_team}."),
            self._event(62, "home", "goal", description=f"GOAL! {self.home_team} extend their lead!"),
            self._event(65, "away", "substitution", description=f"{self.away_team} make their final substitution."),
            self._event(68, "home", "yellow_card", description=f"Yellow card for {self.home_team}."),
            self._event(72, "away", "goal", description=f"GOAL! {self.away_team} pull one back!"),
            self._event(75, "home", "substitution", description=f"{self.home_team} make their final substitution."),
            self._event(78, "away", "yellow_card", description=f"Yellow card for {self.away_team}."),
            self._event(82, "home", "goal", description=f"GOAL! {self.home_team} seal the victory!"),
            self._event(85, "away", "yellow_card", description=f"Yellow card for {self.away_team}."),
            self._event(88, "home", "yellow_card", description=f"Yellow card for {self.home_team}."),
            self._event(90, "info", "full-time", description="Full-time, all over!"),
        ]

        # Add commentary and update scores for all events
        for ev in debug_events:
            if ev["event"]["type"] == "goal":
                team = ev["event"]["team"]
                self._current_score[team] += 1
            ev["score"] = self._current_score.copy()
            
            # Add commentary for all events
            team_name = self.home_team if ev["event"]["team"] == "home" else self.away_team
            ev["event"]["commentary"] = self._get_default_commentary(ev["event"]["type"], team_name)

        return [e for e in debug_events if start_min < e["minute"] <= end_min]


# ──────────────────────────────────────────────────────────────────────────
#  Example usage (remove or comment out in production)
# ──────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    stats = MatchStats("match_statistics.json")
    svc = MatchService("Ajax", "PSV", seed=42, stats_backend=stats, use_llm=False)

    async def run():
        async for line in svc.stream_first_half():
            print(line, end="")
        async for line in svc.stream_second_half():
            print(line, end="")

    asyncio.run(run())
