"""
Thin wrapper around PlayerNameService that injects
retrieved name parts into the prompt.
"""
from __future__ import annotations
import random
from typing import List, Dict, Optional

from langchain.prompts import PromptTemplate
from langchain_core.language_models import BaseLanguageModel

from .player_name_service import PlayerNameService
from .dataset_name_rag   import NamePartsBackend


class RAGPlayerNameService(PlayerNameService):
    _EXAMPLE_LIMIT = 20     # how many real names to show as examples
    _FALLBACK_POOL = 200    # pool size for combinatorial fallback

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
        theme: Optional[str] = None,
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
        loc   = f"Nationality/style: {nationality}" if nationality else ""
        them  = f"Theme: {theme}"                   if theme       else ""

        prompt = PromptTemplate(
            template=f"""
You are a creative sports name generator.

{example_lines}\
### Task
Generate **11 DISTINCT** football player names as a **comma-separated list**.

{loc}
{them}

### Must-follow rules
1. Each entry = first name + space + last name.
2. **No real-world players** – do not output the examples above.
3. Reflect nationality / theme if provided.
4. Return only the 11 names, nothing else.

### Your output
""",
            input_variables=[],
        )

        raw = (prompt | self.llm).invoke({}).strip()
        names = self._NAME_RE.findall(raw)

        # 3. deterministic fallback
        if len(names) < 11:
            pool_f = (firsts if nationality else self.backend._any_firsts())[: self._FALLBACK_POOL]
            pool_l = (lasts  if nationality else self.backend._any_lasts()) [: self._FALLBACK_POOL]
            while len(names) < 11:
                cand = f"{random.choice(pool_f)} {random.choice(pool_l)}"
                if cand not in names:
                    names.append(cand)
        names = names[:11]

        return self._attach_positions(names) if with_positions else \
               [{"name": n} for n in names]


# quick test
if __name__ == "__main__":
    svc = RAGPlayerNameService()
    for p in svc.generate_team(nationality="Norwegian", theme="Viking legends")[0]:
        print(f"{p['position']:<20}  {p['name']}")