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
    ):
        self.home_team = home_team
        self.away_team = away_team
        self.debug_mode = debug_mode
        self.chunk_size = 15  # minutes per chunk
        self.event_delay = 0.5  # seconds between events

        # RNGs
        self._rng = random.Random(seed)
        self._np_rng = np.random.default_rng(seed)

        # Override parameters if dataset supplied
        if stats_backend:
            self._apply_stats_backend(stats_backend)


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
        """Stream first half events in chunks."""
        if not self._generated:
            self._events = []
            async for event in self._stream_chunk(0, 45):
                yield event
            self._generated = True
        else:
            # Stream existing events
            for ev in self._events:
                if ev["minute"] > 45:
                    break
                yield await self._process_event(ev)

        # Add half-time event
        half_time_event = self._event(45, "info", "half-time")
        yield await self._process_event(half_time_event)
        self._is_half_time = True

    async def stream_second_half(self) -> AsyncGenerator[str, None]:
        """Stream second half events in chunks."""
        if not self._is_half_time:
            raise RuntimeError("Second half requested before half-time.")

        async for event in self._stream_chunk(45, 90):
            yield event

        # Add full-time event
        full_time_event = self._event(90, "info", "full-time")
        yield await self._process_event(full_time_event)

    async def _stream_chunk(self, start_min: int, end_min: int) -> AsyncGenerator[str, None]:
        """Stream events for a specific time chunk."""
        for chunk_start in range(start_min, end_min, self.chunk_size):
            chunk_end = min(chunk_start + self.chunk_size, end_min)
            new_events = self._generate_timeline_chunk(chunk_start, chunk_end)
            self._events.extend(new_events)
            
            for ev in new_events:
                yield await self._process_event(ev)

    async def _process_event(self, event: Dict[str, Any]) -> str:
        """Process a single event and return its JSON representation."""
        try:
            self._update_stats(event)
            event["stats"] = self._stats
            await asyncio.sleep(self.event_delay)
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

    def _generate_timeline_chunk(self, start_min: int, end_min: int) -> List[Dict[str, Any]]:
        """Generate events for a specific time chunk."""
        if self.debug_mode:
            return self._generate_debug_timeline_chunk(start_min, end_min)

        raw = (
            self._simulate_goals_chunk(start_min, end_min) +
            self._simulate_yellows_reds_chunk(start_min, end_min) +
            self._simulate_substitutions_chunk(start_min, end_min)
        )
        raw.sort(key=lambda e: e["minute"])

        # Update scores and add descriptions
        for ev in raw:
            if ev["event"]["type"] == "goal":
                team = ev["event"]["team"]
                self._current_score[team] += 1
            ev["score"] = self._current_score.copy()
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
