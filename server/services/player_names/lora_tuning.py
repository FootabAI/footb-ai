from __future__ import annotations
import json, importlib
import torch, datasets
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    DataCollatorForLanguageModeling,
    TrainingArguments,
    Trainer,
    BitsAndBytesConfig,
)
from peft import LoraConfig, get_peft_model
import bitsandbytes as bnb

# ── 1. paths & hyper‑params ─────────────────────────────────────────────
BASE       = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
JSONL      = "name_tune_1name.jsonl"
OUT_DIR    = "name-lora_tinyllama"
MAXLEN     = 256
BATCH_SIZE = 16
EPOCHS     = 3

# ── 2. load & preprocess dataset ────────────────────────────────────────
ds = datasets.load_dataset("json", data_files=JSONL)["train"]

# Merge "instruction" + "response" into single training text
def merge_instruction_response(example):
    return {
        "text": example["instruction"] + example["response"]
    }

ds = ds.map(merge_instruction_response)

# ── 3. tokenizer ────────────────────────────────────────────────────────
tok = AutoTokenizer.from_pretrained(
    BASE,
    use_fast=True,
    trust_remote_code=True,  # required for chat-formatted models like TinyLlama
)

if tok.pad_token_id is None:
    tok.pad_token = tok.eos_token  # reuse EOS for padding

# Tokenization function
def tok_func(example):
    return tok(
        example["text"],
        truncation=True,
        max_length=MAXLEN,
        padding="max_length",
    )

tok_ds = ds.map(tok_func, batched=False).train_test_split(test_size=0.02)
collate = DataCollatorForLanguageModeling(tok, mlm=False)

# ── 4. load 4-bit quantized base model ──────────────────────────────────
bnb_cfg = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
)

model = AutoModelForCausalLM.from_pretrained(
    BASE,
    device_map="auto",
    quantization_config=bnb_cfg,
    torch_dtype=torch.bfloat16,
)

# ── 5. apply LoRA adapter ───────────────────────────────────────────────
lora_cfg = LoraConfig(
    r=16,
    lora_alpha=32,
    lora_dropout=0.1,
    bias="none",
    task_type="CAUSAL_LM",
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",  # attention
        "gate_proj", "up_proj", "down_proj",    # FFN
    ],
)

model = get_peft_model(model, lora_cfg)

# ── 6. training setup ───────────────────────────────────────────────────
args = TrainingArguments(
    output_dir=OUT_DIR,
    per_device_train_batch_size=BATCH_SIZE,
    gradient_accumulation_steps=4,
    num_train_epochs=EPOCHS,
    lr_scheduler_type="cosine",
    learning_rate=1e-4,
    logging_steps=25,
    save_strategy="epoch",
    bf16=True,  # use bfloat16 if supported (A100 = ✅)
)

trainer = Trainer(
    model=model,
    args=args,
    train_dataset=tok_ds["train"],
    eval_dataset=tok_ds["test"],
    data_collator=collate,
)

# ── 7. train & save ─────────────────────────────────────────────────────
if __name__ == "__main__":
    trainer.train()
    model.save_pretrained(OUT_DIR)  # saves LoRA adapter
    tok.save_pretrained(OUT_DIR)