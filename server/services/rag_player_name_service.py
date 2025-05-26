"""
RAG-enhanced generator: injects real name parts into the prompt
and guarantees 11 distinct synthetic names.
"""
from __future__ import annotations
import random
from typing import List, Dict, Optional

from langchain.prompts import PromptTemplate
from langchain_core.language_models import BaseLanguageModel

from .player_name_service import PlayerNameService
from .dataset_name_rag   import NamePartsBackend


class RAGPlayerNameService(PlayerNameService):
    _EXAMPLE_LIMIT = 20
    _FALLBACK_POOL = 200

    def __init__(
        self,
        llm: BaseLanguageModel | None = None,
        temperature: float = 0.7,
        backend: NamePartsBackend | None = None,
    ) -> None:
        super().__init__(llm=llm, temperature=temperature)
        self.backend = backend or NamePartsBackend()

    # override
    def generate_player_names(
        self,
        nationality: Optional[str] = None,
        with_positions: bool = True,
    ) -> List[Dict[str, str]]:

        # 1. retrieve parts
        example_lines, firsts, lasts = "", [], []
        if nationality:
            firsts, lasts = self.backend.random_name_parts(nationality)
            examples = [f"{f} {l}" for f, l in zip(firsts, lasts)][: self._EXAMPLE_LIMIT]
            if examples:
                example_lines = "### Example real names (do NOT repeat!)\n" \
                                + ", ".join(examples) + "\n\n"

        # 2. build prompt
        loc = f"Nationality/style: {nationality}" if nationality else ""

        prompt = PromptTemplate(
            template=f"""
You are a creative sports-name generator.

{example_lines}\
### Task
Generate **11 DISTINCT** football player names as a **comma-separated list**.

{loc}

### Must-follow rules
1. Each entry = first name + space + last name.
2. **No real-world players** – do not output the examples above.
3. Reflect nationality if provided.
4. Return **only** the 11 names, nothing else.

### Your output
""",
            input_variables=[],
        )

        raw   = (prompt | self.llm).invoke({}).strip()
        names = self._NAME_RE.findall(raw)

        # 3. deterministic fallback (no duplicates or garbage)
        if len(names) < 11:
            pool_f = (firsts or self.backend._any_firsts())[: self._FALLBACK_POOL]
            pool_l = (lasts  or self.backend._any_lasts()) [: self._FALLBACK_POOL]
            seen = set(names)
            while len(names) < 11 and pool_f and pool_l:
                cand = f"{random.choice(pool_f)} {random.choice(pool_l)}"
                if cand not in seen:
                    names.append(cand)
                    seen.add(cand)

        # clean & trim
        names = [
            n for n in names
            if " " in n and n[0].isupper() and n.replace(" ", "").isalpha()
        ][:11]

        return self._attach_positions(names) if with_positions else \
               [{"name": n} for n in names]


# self-test
if __name__ == "__main__":
    svc = RAGPlayerNameService()
    for p in svc.generate_team(nationality="Norwegian")[0]:
        print(f"{p['position']:<20}  {p['name']}")