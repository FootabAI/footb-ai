"""
Offline football-name generator (instruction-tuned, no OpenAI).
"""

from __future__ import annotations
import re, random, torch
from typing import List, Optional, Dict, Tuple

# ─────────────────────────────────────────────────────────────
# 1.  HuggingFace → LangChain wrapper
# ─────────────────────────────────────────────────────────────
def build_local_llm(
    model_name: str = "microsoft/phi-2",   # 2.7 B, 2 GB VRAM in fp16
    temperature: float = 0.7,
    max_new_tokens: int = 90,
):
    from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
    from langchain_community.llms import HuggingFacePipeline

    tok = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForCausalLM.from_pretrained(model_name, torch_dtype="auto")
    model.to("cuda" if torch.cuda.is_available() else "cpu")

    gen_pipe = pipeline(
        "text-generation",
        model=model,
        tokenizer=tok,
        temperature=temperature,
        max_new_tokens=max_new_tokens,
        do_sample=True,
        pad_token_id=tok.eos_token_id,
    )
    return HuggingFacePipeline(pipeline=gen_pipe, model_kwargs={})


# ─────────────────────────────────────────────────────────────
# 2.  PlayerNameService
# ─────────────────────────────────────────────────────────────
from langchain_core.language_models import BaseLanguageModel
from langchain.prompts import PromptTemplate


class PlayerNameService:
    DEFAULT_POSITIONS = [
        "Goalkeeper",
        "Right-Back", "Centre-Back", "Centre-Back", "Left-Back",
        "Central Midfielder", "Central Midfielder", "Attacking Midfielder",
        "Right Winger", "Left Winger", "Striker",
    ]
    _NAME_RE = re.compile(r"\b[A-Z][a-zA-ZÀ-ÖØ-öø-ÿ'-]+ [A-Z][a-zA-ZÀ-ÖØ-öø-ÿ'-]+\b")

    def __init__(self, llm: BaseLanguageModel | None = None, temperature: float = 0.7):
        self.llm = llm or build_local_llm(temperature=temperature)

    # ─── core generator ───────────────────────────────────────
    def generate_player_names(
        self,
        nationality: Optional[str] = None,
        theme: Optional[str] = None,
        with_positions: bool = True,
    ) -> List[Dict[str, str]]:

        loc_line   = f"Nationality/style: {nationality}" if nationality else ""
        theme_line = f"Theme: {theme}"                   if theme       else ""

        prompt = PromptTemplate(
            template=f"""
You are a creative sports name generator.

### Task
Generate **11 DISTINCT** football player names as a **comma-separated list**.

{loc_line}
{theme_line}

### Must-follow rules
1. Each entry = first name + space + last name.
2. No real-world famous players.
3. Reflect nationality / theme if provided.
4. Return only the 11 names, nothing else.

### Your output
""",
            input_variables=[],
        )

        raw = (prompt | self.llm).invoke({}).strip()

        # ── regex-extract exactly 11 names ─────────────────────
        names = self._NAME_RE.findall(raw)
        if len(names) < 11:
            filler_first = ["Ole", "Bjørn", "Sverre", "Knut", "Eirik"]
            filler_last  = ["Haugstad", "Eiriksson", "Solberg", "Lund", "Halvorsen"]
            while len(names) < 11:
                names.append(f"{random.choice(filler_first)} {random.choice(filler_last)}")
        names = names[:11]

        return self._attach_positions(names) if with_positions else \
               [{"name": n} for n in names]

    # convenience
    def generate_team(
        self,
        nationality: Optional[str] = None,
        theme: Optional[str] = None,
        with_positions: bool = True,
    ) -> Tuple[List[Dict[str, str]], List[str]]:
        squad = self.generate_player_names(nationality, theme, with_positions)
        return squad, [p["name"] for p in squad]

    # helper
    def _attach_positions(self, names: List[str]) -> List[Dict[str, str]]:
        return [
            {"name": n, "position": pos}
            for n, pos in zip(names, self.DEFAULT_POSITIONS)
        ]


# ─────────────────────────────────────────────────────────────
# 3.  Quick self-test
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    svc = PlayerNameService()
    print(svc.generate_team(nationality="Norwegian", theme="Viking legends")[0])