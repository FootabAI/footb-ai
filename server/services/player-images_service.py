import torch
from diffusers import StableDiffusionPipeline
import os
import time

# Setup device
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

# Load a publicly available model
model_id = "runwayml/stable-diffusion-v1-5"  # This is a public model

try:
    print("Loading model...")
    pipe = StableDiffusionPipeline.from_pretrained(
        model_id,
        torch_dtype=torch.float16 if device == "cuda" else torch.float32,
        safety_checker=None,  # Disable safety checker for speed
        requires_safety_checker=False
    )
    pipe = pipe.to(device)
    
    # Enable memory optimization
    pipe.enable_attention_slicing()
    
    # Create output folder
    output_dir = "avatars"
    os.makedirs(output_dir, exist_ok=True)
    
    # Check for existing avatars
    existing_avatars = [f for f in os.listdir(output_dir) if f.startswith("avatar_") and f.endswith(".png")]
    start_index = len(existing_avatars) + 1
    
    if start_index > 1:
        print(f"Found {len(existing_avatars)} existing avatars. Continuing from avatar_{start_index}")
    
    # Generate remaining avatars
    total_avatars = 11
    remaining = total_avatars - (start_index - 1)
    
    if remaining <= 0:
        print("All 11 avatars have already been generated!")
        exit(0)
    
    print(f"Generating {remaining} more avatars...")
    
    for i in range(start_index, total_avatars + 1):
        start_time = time.time()
        print(f"\nGenerating avatar {i}/11...")
        
        # More specific prompt for professional portrait style
        prompt = (
            "professional headshot portrait of a football player, "
            "centered face, white background, studio lighting, "
            "high quality, detailed face, professional photography, "
            "neutral expression, front view, clean background"
        )
        negative_prompt = (
            "cartoon, anime, illustration, painting, drawing, "
            "low quality, blurry, dark background, side view, "
            "multiple people, text, watermark, logo, jersey, "
            "sports equipment, action shot, full body"
        )
        
        image = pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            num_inference_steps=30,  # Increased for better quality
            guidance_scale=7.5,      # Increased for better prompt adherence
            height=512,              # Increased size for better detail
            width=512,               # Increased size for better detail
            seed=i + 42              # Consistent seed for reproducibility
        ).images[0]
        
        output_path = os.path.join(output_dir, f"avatar_{i}.png")
        image.save(output_path, optimize=True, quality=95)  # Increased quality
        
        elapsed_time = time.time() - start_time
        print(f"Generated avatar_{i}.png in {elapsed_time:.1f} seconds")
    
    # Verify all avatars were created
    final_avatars = [f for f in os.listdir(output_dir) if f.startswith("avatar_") and f.endswith(".png")]
    if len(final_avatars) == total_avatars:
        print(f"\nSuccessfully generated all {total_avatars} avatars in ./{output_dir}/")
    else:
        print(f"\nWarning: Only generated {len(final_avatars)} out of {total_avatars} avatars")

except Exception as e:
    print(f"Error: {str(e)}")
    print("\nTroubleshooting steps:")
    print("1. Make sure you have a stable internet connection")
    print("2. Try running 'pip install --upgrade diffusers transformers torch'")
    print("3. If the error persists, try using a different model by changing model_id")
    exit(1)
