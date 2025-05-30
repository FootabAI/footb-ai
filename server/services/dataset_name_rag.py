"""
In-memory backend that groups FIFA player names by nationality.
"""
from __future__ import annotations
import pandas as pd, pathlib, random
from collections import defaultdict
from typing import Dict, List, Tuple

_DATA_PATH = pathlib.Path(__file__).with_suffix("").parent / "../data/fifa_players.csv"

# adjective → country mapping (extend as needed)
_ADJ_TO_COUNTRY = {
    "Norwegian": "Norway",    "Swedish": "Sweden",      "Danish": "Denmark",
    "English": "England",     "Scottish": "Scotland",   "Welsh": "Wales",
    "Dutch": "Netherlands",   "French": "France",       "German": "Germany",
    "Spanish": "Spain",       "Portuguese": "Portugal", "Italian": "Italy",
}

class NamePartsBackend:
    """Keeps {nat: [firsts]}, {nat: [lasts]} in memory."""

    def __init__(self, csv_path: str | pathlib.Path | None = None) -> None:
        csv_path = pathlib.Path(csv_path or _DATA_PATH)
        df = pd.read_csv(csv_path, usecols=["full_name", "nationality"]).dropna()

        self.first_by_nat: Dict[str, List[str]] = defaultdict(list)
        self.last_by_nat:  Dict[str, List[str]] = defaultdict(list)

        for full, nat in zip(df["full_name"], df["nationality"]):
            toks = full.split()
            if len(toks) >= 2:
                self.first_by_nat[nat].append(toks[0])
                self.last_by_nat[nat].append(toks[-1])

    # ─── retrieval ────────────────────────────────────────────
    def random_name_parts(
        self, nationality: str, k_first: int = 30, k_last: int = 30
    ) -> Tuple[List[str], List[str]]:

        nat = _ADJ_TO_COUNTRY.get(nationality, nationality)

        first_pool = self.first_by_nat.get(nat, [])
        last_pool  = self.last_by_nat.get(nat, [])

        firsts = random.sample(first_pool or self._any_firsts(),
                               k=min(k_first, len(first_pool) or k_first))
        lasts  = random.sample(last_pool  or self._any_lasts(),
                               k=min(k_last,  len(last_pool)  or k_last))
        return firsts, lasts

    # fallbacks
    def _any_firsts(self) -> List[str]:
        return random.choice(list(self.first_by_nat.values()))

    def _any_lasts(self) -> List[str]:
        return random.choice(list(self.last_by_nat.values()))