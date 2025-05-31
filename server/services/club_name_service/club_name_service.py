from __future__ import annotations
from typing import Optional, Dict

import torch
import random
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel


class ClubNameService:

    def __init__(
        self,
        model_name: str = "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
        adapter_dir: str = "club-lora_tinyllama",  # use your LoRA fine-tuned for clubs
        temperature: float = 1.0,
    ) -> None:
        self.tokenizer = AutoTokenizer.from_pretrained(model_name, use_fast=True)
        base_model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float16,
            device_map="auto"
        )
        model = PeftModel.from_pretrained(base_model, adapter_dir)
        self.model = model.merge_and_unload()
        self.temperature = temperature

    def generate_club(
        self,
        nationality: Optional[str] = "English",
        with_suffix: bool = True,
    ) -> Dict[str, str]:
        """
        Generate a single fictional football club name.
        Optionally append a suffix like "FC" or "United".
        """

        prompt = f"""You are a creative football club name assistant.

Rules:
- Generate ONE unique and realistic football club name.
- The name must not match any real-life club.
- It must sound culturally plausible for a club from {nationality}.
- Use common football naming styles.
- Output ONLY the name in double quotes, no explanations or code

Your turn:
"
"""

        # Tokenize and generate
        inputs = self.tokenizer(prompt, return_tensors="pt").to(self.model.device)

        with torch.no_grad():
            output = self.model.generate(
                **inputs,
                max_new_tokens=12,
                temperature=self.temperature,
                top_p=0.95,
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id
            )

        decoded = self.tokenizer.decode(output[0], skip_special_tokens=True)
        name = decoded[len(prompt):].split('"')[0].strip()
        print(name)


        return {"name": name}


# ─── 3. Self-test ────────────────────────────────────────────────────────
if __name__ == "__main__":
    service = ClubNameService()
    print(service.generate_club(nationality="English"))
