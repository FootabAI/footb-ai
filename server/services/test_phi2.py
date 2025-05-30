from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel
import torch
from dataset_name_rag import NamePartsBackend  # your in-memory FIFA RAG
import random

def generate_name(nationality="English"):
    model_name = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
    adapter_dir = "name-lora_tinyllama"

    # Load tokenizer and base model
    tokenizer = AutoTokenizer.from_pretrained(model_name, use_fast=True)
    base_model = AutoModelForCausalLM.from_pretrained(
        model_name,
        torch_dtype=torch.float16,
        device_map="auto"
    )

    # Apply LoRA adapter
    model = PeftModel.from_pretrained(base_model, adapter_dir)
    model = model.merge_and_unload()


    # Build dynamic prompt with examples
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

    # Tokenize and run generation
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

    with torch.no_grad():
        output = model.generate(
            **inputs,
            max_new_tokens=10,
            temperature=1,
            top_p=0.95,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id
        )

    response = tokenizer.decode(output[0], skip_special_tokens=True)
    name = response[len(prompt):].split('"')[0].strip()
    return name
# Example usage
print(generate_name("English"))