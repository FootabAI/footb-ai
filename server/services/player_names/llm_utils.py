# services/llm_utils.py
"""
Utility that returns a LangChain-compatible LLM,
optionally patched with a LoRA adapter trained earlier.
"""
from __future__ import annotations
from typing import Optional

import torch
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    pipeline,
    BitsAndBytesConfig,
)
from langchain_community.llms import HuggingFacePipeline
from peft import PeftModel

def build_local_llm(
    adapter_dir: Optional[str] = "name-lora_gpu",   # your GPU-trained adapter
    model_name: str = "microsoft/phi-2",            # use Phi-2
    temperature: float = 0.7,
    max_new_tokens: int = 100,
) -> HuggingFacePipeline:
    # 1. Load tokenizer and base model in 4-bit
    tok = AutoTokenizer.from_pretrained(model_name, use_fast=True)

    bnb_cfg = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
    )
    base_model = AutoModelForCausalLM.from_pretrained(
        model_name,
        device_map="auto",
        quantization_config=bnb_cfg,
        torch_dtype=torch.float16,
    )

    # 2. Apply LoRA adapter if provided
    if adapter_dir:
        base_model = PeftModel.from_pretrained(base_model, adapter_dir)
        base_model = base_model.merge_and_unload()  # bake LoRA into the weights

    # 3. Build HuggingFace pipeline
    gen_pipe = pipeline(
        "text-generation",
        model=base_model,
        tokenizer=tok,
        temperature=temperature,
        max_new_tokens=max_new_tokens,
        do_sample=True,
        pad_token_id=tok.eos_token_id,
    )
    return HuggingFacePipeline(pipeline=gen_pipe, model_kwargs={})