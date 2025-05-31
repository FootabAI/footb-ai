import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel
import pandas as pd
import json
from pathlib import Path
from tqdm import tqdm
import re

# ─────────────────────────────
# Load real club names for filtering
# ─────────────────────────────
REAL_NAMES_CSV = "data/football_clubs.csv"
real_clubs_df = pd.read_csv(REAL_NAMES_CSV)
real_names = set(name.strip().lower() for name in real_clubs_df["Name"].dropna())

# ─────────────────────────────
# Model setup
# ─────────────────────────────
MODEL_NAME = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
ADAPTER_DIR = "club-lora_tinyllama"
NUM_SAMPLES = 1000
NATIONALITY = "England"
THEME = "rivers and storms"  # Optional

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, use_fast=True)
base_model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    torch_dtype=torch.float16,
    device_map="auto"
)
model = PeftModel.from_pretrained(base_model, ADAPTER_DIR)
model = model.merge_and_unload()

# ─────────────────────────────
# Prompt setup
# ─────────────────────────────
def build_prompt(nationality, theme=None):
    prompt = f"""You are a creative assistant for naming football clubs.

Rules:
- Generate ONE unique and realistic football club name.
- The name must sound plausible for a club from {nationality}.
- Do NOT use names of real clubs.
- Only return the name in double quotes.
"""
    if theme:
        prompt += f"- Add a theme of '{theme}'.\n"

    prompt += "\nYour turn:\n\""
    return prompt

# ─────────────────────────────
# Run generation
# ─────────────────────────────
generated_names = []
malformed_count = 0
real_name_hits = 0
duplicate_count = 0

seen_names = set()
name_re = re.compile(r'([A-Z][a-zA-ZÀ-ÖØ-öø-ÿ&\'\s\-]+)')

for _ in tqdm(range(NUM_SAMPLES), desc="Generating"):
    prompt = build_prompt(NATIONALITY, THEME)
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

    with torch.no_grad():
        output = model.generate(
            **inputs,
            max_new_tokens=10,
            temperature=1.0,
            top_p=0.95,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id
        )

    decoded = tokenizer.decode(output[0], skip_special_tokens=True)
    match = name_re.search(decoded[len(prompt):])

    if not match:
        malformed_count += 1
        continue

    name = match.group(1).strip()
    name_lower = name.lower()

    if name_lower in seen_names:
        duplicate_count += 1
        continue

    if name_lower in real_names:
        real_name_hits += 1
        continue

    seen_names.add(name_lower)
    generated_names.append(name)

# ─────────────────────────────
# Save results
# ─────────────────────────────
Path("results").mkdir(exist_ok=True)
with open("results/generated_club_names.json", "w", encoding="utf-8") as f:
    json.dump(generated_names, f, ensure_ascii=False, indent=2)

# ─────────────────────────────
# Metrics
# ─────────────────────────────
print("\n=== Evaluation Results ===")
print(f"Total requested:      {NUM_SAMPLES}")
print(f"Generated OK:         {len(generated_names)}")
print(f" - Duplicates:        {duplicate_count}")
print(f" - Malformed:         {malformed_count}")
print(f" - Real name matches: {real_name_hits}")
print(f"Uniqueness rate:      {len(generated_names) / NUM_SAMPLES:.2%}")