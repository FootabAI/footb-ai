from __future__ import annotations
from typing import Optional, Dict, List
import os

import torch
import random
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel, PeftConfig


class PlayerNameService:
    DEFAULT_POSITIONS = [
        "Goalkeeper",
        "Right-Back",
        "Centre-Back",
        "Centre-Back",
        "Left-Back",
        "Central Midfielder",
        "Central Midfielder",
        "Attacking Midfielder",
        "Right Winger",
        "Left Winger",
        "Striker"
    ]

    def __init__(
        self,
        model_name: str = "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
        adapter_dir: str = "name-lora_tinyllama",
        temperature: float = 1.0,
    ) -> None:
        # Get absolute path to adapter directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        adapter_path = os.path.join(os.path.dirname(current_dir), adapter_dir)
        
        self.tokenizer = AutoTokenizer.from_pretrained(model_name, use_fast=True)
        base_model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float16,
            device_map="auto"
        )
        model = PeftModel.from_pretrained(base_model, adapter_path)
        self.model = model.merge_and_unload()
        self.config = PeftConfig.from_pretrained(adapter_path)
        self.temperature = temperature

    def generate_player(
        self,
        nationality: Optional[str] = "English",
        position: Optional[str] = None,
    ) -> Dict[str, str]:
        """
        Generate a single fictional footballer name.
        Optionally attach a specific position.
        """

        prompt = f"""You are a creative football name assistant.

Rules:
- Generate ONE unique and realistic footballer name.
- The name can not be a real life footballer
- The name must sound culturally plausible for a footballer from {nationality}.
- Use natural first and last name combinations.
- Output ONLY the name in double quotes, no explanations or code.

Your turn:
"
"""

        # Tokenize and generate
        inputs = self.tokenizer(prompt, return_tensors="pt").to(self.model.device)

        with torch.no_grad():
            output = self.model.generate(
                **inputs,
                max_new_tokens=10,
                temperature=self.temperature,
                top_p=0.95,
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id
            )

        decoded = self.tokenizer.decode(output[0], skip_special_tokens=True)
        name = decoded[len(prompt):].split('"')[0].strip()
        print(f"⚡ Generating player: {name}")

        return {
            "name": name,
            "position": position or random.choice(self.DEFAULT_POSITIONS)
        }

    def generate_team(
        self,
        nationality: Optional[str] = "English",
    ) -> List[Dict[str, str]]:
        """
        Generate a complete team of 11 players with appropriate positions.
        """
        players = []
        for position in self.DEFAULT_POSITIONS:
            player = self.generate_player(nationality, position)
            players.append(player)
        return players


# ─── 3. Self-test ────────────────────────────────────────────────────────
if __name__ == "__main__":
    service = PlayerNameService()
    print(service.generate_team(nationality="Norwegian"))