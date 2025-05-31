import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel
import pandas as pd
from tqdm import tqdm
import re

# ─────────────────────────────
# Load real player names for filtering
# ─────────────────────────────
REAL_NAMES_CSV = "data/fifa_players.csv"
real_players_df = pd.read_csv(REAL_NAMES_CSV)
real_names = set(name.strip().lower() for name in real_players_df["full_name"].dropna())

# ─────────────────────────────
# Model setup
# ─────────────────────────────
MODEL_NAME = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
ADAPTER_DIR = "name-lora_tinyllama"
NUM_SAMPLES = 1000
NATIONALITY = "Norwegian"

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
def build_prompt(nationality):
    return f"""You are a creative football name assistant.

Rules:
- Generate ONE unique and realistic footballer name.
- The name can not be a real life footballer.
- The name must sound culturally plausible for a footballer from {nationality}.
- Use natural first and last name combinations.
- Output ONLY the name in double quotes.

Your turn:
"
"""

# ─────────────────────────────
# Run generation
# ─────────────────────────────
generated_names = []
malformed_count = 0
real_name_hits = 0
duplicate_count = 0

seen_names = set()
name_re = re.compile(r'([A-Z][a-zA-ZÀ-ÖØ-öø-ÿ\'\-]+ [A-Z][a-zA-ZÀ-ÖØ-öø-ÿ\'\-]+)')

for _ in tqdm(range(NUM_SAMPLES), desc="Generating"):
    prompt = build_prompt(NATIONALITY)
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
# Print results
# ─────────────────────────────
print("\n=== Evaluation Results ===")
print(f"Total requested:      {NUM_SAMPLES}")
print(f"Generated OK:         {len(generated_names)}")
print(f" - Duplicates:        {duplicate_count}")
print(f" - Malformed:         {malformed_count}")
print(f" - Real name matches: {real_name_hits}")
print(f"Uniqueness rate:      {len(generated_names) / NUM_SAMPLES:.2%}")
print("\nSample outputs:")
for name in generated_names[:20]:
    print("-", name)
