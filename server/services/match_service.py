"""
Real-life–shaped football-match simulator.

• Reads per-match averages (goals, yellows, reds) from the
  “Club-Football-Match-Data-2000-2025” CSV (once, via MatchStats).
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
    ]

    def __init__(self, csv_path: str | Path):
        path = Path(csv_path)
        if not path.exists():
            raise FileNotFoundError(path)
        df = pd.read_csv(path, low_memory=False)[self.REQUIRED_COLS]

        # per-team, per-match averages
        self.lambda_home_goals = df["FTHome"].mean()
        self.lambda_away_goals = df["FTAway"].mean()
        self.lambda_home_yel   = df["HomeYellow"].mean()
        self.lambda_away_yel   = df["AwayYellow"].mean()

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
    ):
        self.home_team = home_team
        self.away_team = away_team

        # RNGs
        self._rng = random.Random(seed)
        self._np_rng = np.random.default_rng(seed)

        # Override Poisson parameters if dataset supplied
        if stats_backend:
            self.GOALS_LAMBDA_HOME = stats_backend.lambda_home_goals
            self.GOALS_LAMBDA_AWAY = stats_backend.lambda_away_goals
            self.YELLOW_LAMBDA_HOME = stats_backend.lambda_home_yel
            self.YELLOW_LAMBDA_AWAY = stats_backend.lambda_away_yel
            self.RED_PROB_AFTER_YELLOW = stats_backend.prob_red_after_yel

        # Optional GPT commentator
        self.llm = (
            ChatOpenAI(model_name="gpt-4o", temperature=llm_temperature)
            if use_llm and ChatOpenAI
            else None
        )

        # State
        self._events: List[Dict[str, Any]] = []
        self._generated = False
        self._is_half_time = False

    # ───────────────────────── STREAMING API ────────────────────────────
    async def stream_first_half(self) -> AsyncGenerator[str, None]:
        if not self._generated:
            self._generate_timeline()

        for ev in self._events:
            if ev["minute"] > 45:
                break
            yield json.dumps(ev) + "\n"
            await asyncio.sleep(1)
            if ev["event"]["type"] == "half-time":
                self._is_half_time = True
                break

    async def stream_second_half(self) -> AsyncGenerator[str, None]:
        if not self._is_half_time:
            raise RuntimeError("Second half requested before half-time.")
        for ev in self._events:
            if ev["minute"] <= 45:
                continue
            yield json.dumps(ev) + "\n"
            await asyncio.sleep(1)

    # ───────────────────────── TIMELINE BUILD ───────────────────────────
    def _generate_timeline(self) -> None:
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
    def _event(minute: int, team: str, etype: str) -> Dict[str, Any]:
        return {
            "minute": minute,
            "event": {"team": team, "type": etype, "description": ""},
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
            "You are a live-text commentator. "
            "Write one punchy update for this event:\n"
            f"Minute: {ev['minute']}\n"
            f"Type: {etype}\n"
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
    stats = MatchStats("mMatches.csv")
    svc = MatchService("Ajax", "PSV", seed=42, stats_backend=stats, use_llm=False)

    async def run():
        async for line in svc.stream_first_half():
            print(line, end="")
        async for line in svc.stream_second_half():
            print(line, end="")

    asyncio.run(run())
