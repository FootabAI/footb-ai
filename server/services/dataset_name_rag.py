"""
Lightweight backend that turns fifa_players.csv
into first-name / last-name lookup tables per nationality.
No vector store is strictly necessary – a Python dict is plenty – 
but this module *can* be swapped for a FAISS-powered retriever later.
"""
from __future__ import annotations
import pandas as pd
import pathlib
import random
from collections import defaultdict
from typing import Dict, List, Tuple


_DATA_PATH = pathlib.Path(__file__).with_suffix("").parent / "../fifa_players.csv"

# --------------------------------------------------------------------------- #
# Public API
# --------------------------------------------------------------------------- #
class NamePartsBackend:
    """Keeps {nat: [firsts]}, {nat: [lasts]} in memory."""
    
    def __init__(self, csv_path: str | pathlib.Path | None = None) -> None:
        csv_path = pathlib.Path(csv_path or _DATA_PATH)
        df = pd.read_csv(csv_path, usecols=["full_name", "nationality"])
        df.dropna(subset=["full_name", "nationality"], inplace=True)

        self.first_by_nat: Dict[str, List[str]] = defaultdict(list)
        self.last_by_nat:  Dict[str, List[str]] = defaultdict(list)
        self._populate(df)

    # ----------------- internal helpers ------------------------------------ #
    def _populate(self, df: pd.DataFrame) -> None:
        for full, nat in zip(df["full_name"], df["nationality"]):
            toks = full.replace("-", "-").split()
            if len(toks) < 2:
                continue
            first, last = toks[0], toks[-1]
            self.first_by_nat[nat].append(first)
            self.last_by_nat[nat].append(last)

    # ----------------- retrieval ------------------------------------------- #
    def random_name_parts(
        self, nationality: str, k_first: int = 30, k_last: int = 30
    ) -> Tuple[List[str], List[str]]:
        """Return *k_first* + *k_last* unique parts for this nationality."""
        firsts = random.sample(
            self.first_by_nat.get(nationality, []) or self.first_by_nat_random(),
            k=min(k_first, len(self.first_by_nat.get(nationality, [])))
        )
        lasts = random.sample(
            self.last_by_nat.get(nationality, []) or self.last_by_nat_random(),
            k=min(k_last, len(self.last_by_nat.get(nationality, [])))
        )
        return firsts, lasts

    def first_by_nat_random(self) -> List[str]:
        # Fallback for unseen nationality
        return random.choice(list(self.first_by_nat.values()))

    def last_by_nat_random(self) -> List[str]:
        return random.choice(list(self.last_by_nat.values()))