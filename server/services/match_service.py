"""
Real-life–shaped football-match simulator.

• Reads per-match averages (goals, yellows, reds) from the
  "Club-Football-Match-Data-2000-2025" CSV (once, via MatchStats).
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
    Load *Club-Football-Match-Data-2000-2025* once and expose league-wide means.
    """

    REQUIRED_COLS = [
        "FTHome", "FTAway",
        "HomeYellow", "AwayYellow",
        "HomeRed", "AwayRed",
        "HomeShots", "AwayShots",
        "HomeTarget", "AwayTarget",
        "HomeFouls", "AwayFouls",
        "HomeCorners", "AwayCorners",
    ]

    def __init__(self, csv_path: str | Path):
        path = Path(csv_path)
        if not path.exists():
            raise FileNotFoundError(path)
        df = pd.read_csv(csv_path, low_memory=False)[self.REQUIRED_COLS]

        # per-team, per-match averages
        self.lambda_home_goals = df["FTHome"].mean()
        self.lambda_away_goals = df["FTAway"].mean()
        self.lambda_home_yel   = df["HomeYellow"].mean()
        self.lambda_away_yel   = df["AwayYellow"].mean()
        self.lambda_home_shots = df["HomeShots"].mean()
        self.lambda_away_shots = df["AwayShots"].mean()
        self.lambda_home_sot   = df["HomeTarget"].mean()
        self.lambda_away_sot   = df["AwayTarget"].mean()
        self.lambda_home_fouls = df["HomeFouls"].mean()
        self.lambda_away_fouls = df["AwayFouls"].mean()
        self.lambda_home_corners = df["HomeCorners"].mean()
        self.lambda_away_corners = df["AwayCorners"].mean()

        # Calculate possession based on shots and corners (as a proxy)
        total_home_actions = df["HomeShots"].mean() + df["HomeCorners"].mean()
        total_away_actions = df["AwayShots"].mean() + df["AwayCorners"].mean()
        total_actions = total_home_actions + total_away_actions
        self.lambda_home_poss = (total_home_actions / total_actions) * 100
        self.lambda_away_poss = (total_away_actions / total_actions) * 100

        # # Calculate pass accuracy based on shots on target ratio
        # self.lambda_home_pass_acc = (df["HomeTarget"].mean() / df["HomeShots"].mean()) * 100 if df["HomeShots"].mean() > 0 else 80
        # self.lambda_away_pass_acc = (df["AwayTarget"].mean() / df["AwayShots"].mean()) * 100 if df["AwayShots"].mean() > 0 else 80

        # # Calculate passes based on shots and corners (as a proxy)
        # self.lambda_home_passes = (df["HomeShots"].mean() + df["HomeCorners"].mean()) * 40  # Rough estimate
        # self.lambda_away_passes = (df["AwayShots"].mean() + df["AwayCorners"].mean()) * 40  # Rough estimate

        # empirical probability that a yellow begets a red
        total_yel = df["HomeYellow"].sum() + df["AwayYellow"].sum()
        total_red = df["HomeRed"].sum()  + df["AwayRed"].sum()
        self.prob_red_after_yel = total_red / total_yel if total_yel else 0.05


# ──────────────────────────────────────────────────────────────────────────
#  Live-match generator
# ──────────────────────────────────────────────────────────────────────────
class MatchService:
    # default fall-back parameters (used if no MatchStats supplied)
    GOALS_LAMBDA_HOME = 1.4
    GOALS_LAMBDA_AWAY = 1.1
    YELLOW_LAMBDA_HOME = 3.5
    YELLOW_LAMBDA_AWAY = 3.5
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
    ):
        self.home_team = home_team
        self.away_team = away_team
        self.debug_mode = debug_mode

        # RNGs
        self._rng = random.Random(seed)
        self._np_rng = np.random.default_rng(seed)

        # Override parameters if dataset supplied
        if stats_backend:
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
            self.FOULS_HOME = stats_backend.lambda_home_fouls
            self.FOULS_AWAY = stats_backend.lambda_away_fouls
            self.CORNERS_HOME = stats_backend.lambda_home_corners
            self.CORNERS_AWAY = stats_backend.lambda_away_corners

        # Optional GPT commentator
        self.llm = (
            ChatOpenAI(model_name="gpt-4o", temperature=llm_temperature)
            if use_llm and ChatOpenAI and not debug_mode
            else None
        )

        # State
        self._events: List[Dict[str, Any]] = []
        self._generated = False
        self._is_half_time = False
        self._stats = {
            "home": {
                "possession": 0,
                "shots": 0,
                "shotsOnTarget": 0,
                # "passes": 0,
                # "passAccuracy": 0,
                "fouls": 0,
                "corners": 0,
            },
            "away": {
                "possession": 0,
                "shots": 0,
                "shotsOnTarget": 0,
                # "passes": 0,
                # "passAccuracy": 0,
                "fouls": 0,
                "corners": 0,
            }
        }

    # ───────────────────────── STREAMING API ────────────────────────────
    async def stream_first_half(self) -> AsyncGenerator[str, None]:
        if not self._generated:
            self._generate_timeline()

        for ev in self._events:
            if ev["minute"] > 45:
                break
            try:
                # Update stats for this event
                self._update_stats(ev)
                ev["stats"] = self._stats
                yield json.dumps(ev) + "\n"
                await asyncio.sleep(1)
                if ev["event"]["type"] == "half-time":
                    self._is_half_time = True
                    break
            except Exception as e:
                print(f"Error streaming event: {e}")
                continue

    async def stream_second_half(self) -> AsyncGenerator[str, None]:
        if not self._is_half_time:
            raise RuntimeError("Second half requested before half-time.")
        for ev in self._events:
            if ev["minute"] <= 45:
                continue
            try:
                # Update stats for this event
                self._update_stats(ev)
                ev["stats"] = self._stats
                yield json.dumps(ev) + "\n"
                await asyncio.sleep(1)
            except Exception as e:
                print(f"Error streaming event: {e}")
                continue

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
        progress = minute / 90  # Match progress as a percentage

        # Update possession (slight random variation around base values)
        self._stats["home"]["possession"] = self.POSSESSION_HOME + self._rng.uniform(-2, 2)
        self._stats["away"]["possession"] = 100 - self._stats["home"]["possession"]

        # Update shots and shots on target (proportional to match progress)
        if event["event"]["type"] == "goal":
            # Goals increase shots and shots on target
            team = event["event"]["team"]
            self._stats[team]["shots"] += 1
            self._stats[team]["shotsOnTarget"] += 1
        else:
            # Otherwise, gradually increase based on match progress
            self._stats["home"]["shots"] = int(self.SHOTS_HOME * progress)
            self._stats["away"]["shots"] = int(self.SHOTS_AWAY * progress)
            self._stats["home"]["shotsOnTarget"] = int(self.SHOTS_ON_TARGET_HOME * progress)
            self._stats["away"]["shotsOnTarget"] = int(self.SHOTS_ON_TARGET_AWAY * progress)

        # Update corners (proportional to match progress)
        self._stats["home"]["corners"] = int(self.CORNERS_HOME * progress)
        self._stats["away"]["corners"] = int(self.CORNERS_AWAY * progress)

        # Update fouls (proportional to match progress)
        self._stats["home"]["fouls"] = int(self.FOULS_HOME * progress)
        self._stats["away"]["fouls"] = int(self.FOULS_AWAY * progress)

        # Ensure all values are within realistic ranges
        self._stats["home"]["possession"] = max(0, min(100, self._stats["home"]["possession"]))
        self._stats["away"]["possession"] = max(0, min(100, self._stats["away"]["possession"]))
        # self._stats["home"]["passAccuracy"] = max(0, min(100, self._stats["home"]["passAccuracy"]))
        # self._stats["away"]["passAccuracy"] = max(0, min(100, self._stats["away"]["passAccuracy"]))

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

        # basic template
        base = {
            "goal":         f"GOAL! {team_name} score!",
            "yellow_card":  f"Yellow card for {team_name}.",
            "red_card":     f"RED CARD! {team_name} down to 10 men!",
            "substitution": f"{team_name} make a substitution.",
            "half-time":    "Half-time whistle.",
            "full-time":    "Full-time, all over!",
        }[etype]

        if not self.llm:
            return base

        prompt = (
            "You are a live-text football commentator. "
            "Write one punchy, concise update for this event. "
            "Rules:\n"
            "1. Do not include the minute in the description\n"
            "2. Do not use any emojis or special characters\n"
            "3. Keep it short and impactful\n"
            "4. Focus on the action and its significance\n"
            f"Event: {etype}\n"
            f"Team: {team_name}\n"
            f"Score: {ev['score']['home']}–{ev['score']['away']}\n"
            "Return only the line."
        )
        try:
            return self.llm.invoke(prompt).content.strip()
        except Exception:
            return base


# ──────────────────────────────────────────────────────────────────────────
#  Example usage (remove or comment out in production)
# ──────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    stats = MatchStats("Matches.csv")
    svc = MatchService("Ajax", "PSV", seed=42, stats_backend=stats, use_llm=False)

    async def run():
        async for line in svc.stream_first_half():
            print(line, end="")
        async for line in svc.stream_second_half():
            print(line, end="")

    asyncio.run(run())
