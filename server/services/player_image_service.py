# services/player_image_service.py
import os
import random
import base64
import io
from typing import List, Dict
from pathlib import Path
import torch
from PIL import Image, ImageDraw
import cv2
import numpy as np
from diffusers import StableDiffusionControlNetPipeline, ControlNetModel, DPMSolverMultistepScheduler, EulerAncestralDiscreteScheduler, LCMScheduler


class PlayerImageService:
    _instance = None
    _initialized = False

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(PlayerImageService, cls).__new__(cls)
        return cls._instance

    def __init__(self, pose_image_path=None):
        if self._initialized:
            return
            
        self.output_dir = Path("temp_images")
        self.output_dir.mkdir(exist_ok=True)
        self.use_gpu = torch.cuda.is_available()
        self._setup_pipeline()
        if pose_image_path:
            self.pose_image = self._load_and_validate_pose_image(pose_image_path)
        
        self._initialized = True
        print("✅ PlayerImageService initialized")

    def _setup_pipeline(self):
        """Setup pipeline optimized for CPU processing"""
        try:
            print("🚀 Loading model for CPU processing...")
            controlnet = ControlNetModel.from_pretrained(
                "lllyasviel/sd-controlnet-openpose",
                torch_dtype=torch.float32  # Use float32 for CPU
            )
            
            self.pipe = StableDiffusionControlNetPipeline.from_pretrained(
                "Lykon/DreamShaper",
                controlnet=controlnet,
                torch_dtype=torch.float32,  # Use float32 for CPU
                safety_checker=None,
                requires_safety_checker=False
            )
            
            # Use EulerAncestralDiscreteScheduler for better CPU performance
            self.pipe.scheduler = EulerAncestralDiscreteScheduler.from_config(self.pipe.scheduler.config)
            self.inference_steps = 7  # Reduced steps for CPU
            print("✅ Model loaded successfully")
            
            # Warm up the pipeline once
            print("🔥 Warming up pipeline...")
            try:
                # Create a small test image for warmup
                test_image = Image.new('RGB', (64, 64), color='white')
                self.pipe(
                    prompt="test warmup",
                    negative_prompt="test",
                    image=test_image,
                    num_inference_steps=1,
                    width=64,
                    height=64,
                    guidance_scale=1.0,
                    controlnet_conditioning_scale=1.0
                )
                print("✅ Pipeline warmup complete")
            except Exception as e:
                print(f"⚠️ Pipeline warmup failed: {e}")
                print("Continuing without warmup...")
            
        except Exception as e:
            print(f"⚠️ Model loading failed: {e}")
            raise
    
    def generate_player_image(self, player: Dict) -> Dict:
        """Generate a single player image with optimized settings"""
        print(f"⚡ Generating player: {player['name']}")
        
        try:
            # Generate attributes and create prompt
            attributes = self._generate_attributes()
            positive_prompt, negative_prompt = self._create_prompt(attributes, 1)
            
            # Generate image with optimized settings
            result = self.pipe(
                prompt=positive_prompt,
                negative_prompt=negative_prompt,
                image=self.pose_image,
                num_inference_steps=self.inference_steps,
                guidance_scale=6.5,
                controlnet_conditioning_scale=1.0,
                width=256,
                height=256,
                generator=torch.Generator("cpu").manual_seed(random.randint(1, 1000000))
            )
            
            # Process image
            image = result.images[0]
            image_no_bg = self._remove_background_ai(image)
            
            # Convert to base64
            buffer = io.BytesIO()
            image_no_bg.save(buffer, format="PNG", optimize=True)  # Added optimize=True
            buffer.seek(0)
            image_b64 = base64.b64encode(buffer.getvalue()).decode()
            
            # Return clean response
            return {
                "name": player["name"],
                "position": player["position"],
                "image_base64": image_b64,
                "attributes": attributes
            }
            
        except Exception as e:
            print(f"❌ Failed to generate player: {e}")
            return {
                "name": player["name"],
                "position": player["position"],
                "error": str(e)
            }
    
    def _generate_attributes(self) -> Dict:
        """Generate random player attributes"""
        ethnicities = ["European", "African", "South American", "Asian", "Middle Eastern"]
        hair_colors = {
            "European": ["brown", "blonde", "black"],
            "African": ["black"],
            "South American": ["black", "brown"],
            "Asian": ["black"],
            "Middle Eastern": ["black", "brown"]
        }
        hair_styles = ["short", "buzz cut", "fade cut", "crew cut"]
        
        ethnicity = random.choice(ethnicities)
        hair_color = random.choice(hair_colors[ethnicity])
        
        return {
            "ethnicity": ethnicity,
            "hair_color": hair_color,
            "hair_style": random.choice(hair_styles),
            "age": random.choice(["young adult", "mid-twenties", "late twenties"])
        }
    
    def _create_prompt(self, attributes: Dict, player_num: int) -> tuple[str, str]:
        """Create optimized prompt for DreamShaper"""
        positive = f"""
        close-up headshot portrait of a {attributes['ethnicity']} man,
        {attributes['age']}, male,
        {attributes['hair_color']} {attributes['hair_style']} hair,
        natural features,
        looking straight ahead at camera,
        head and upper shoulders, centered composition,
        face centered in frame, plenty of space around head,
        normal proportions, human imperfections,
        genuine expression, straight-on angle, perfectly centered,
        """
        
        negative = """
        duplicate heads,
        cropped at chin, no space around head, 
        tilted head, angled pose, side angle, rotated, 
        too close, extreme close-up, zoomed in too much, 
        torso, body, arms, hands, 
        tight crop, cropped head, cut off hair, cut off neck, 
        head too large for frame, face filling entire frame, 
        edge of frame cutting face, head touching edges, 
        fantasy, stylized, deformed, bad anatomy, text, watermark, logo, 
        dark, underexposed, overexposed, 
        feminine features
        """
        
        return positive.strip(), negative.strip()
    
    def _remove_background_ai(self, image: Image.Image) -> Image.Image:
        """Remove background from PIL image using rembg"""
        try:
            from rembg import remove
            img_np = np.array(image)
            result_np = remove(img_np)
            return Image.fromarray(result_np)
        except Exception as e:
            print(f"AI background removal failed: {e}")
            return image
    
    def _load_and_validate_pose_image(self, pose_image_path: str) -> Image.Image:
        """Load and validate pose reference image"""
        if not os.path.exists(pose_image_path):
            raise FileNotFoundError(f"Pose file not found: {pose_image_path}")
        pose_image = Image.open(pose_image_path)
        if pose_image.mode != 'RGB':
            pose_image = pose_image.convert('RGB')
        if pose_image.size != (256, 256):
            pose_image = pose_image.resize((256, 256), Image.Resampling.LANCZOS)
        return pose_image
      
if __name__ == "__main__":
    service = PlayerImageService(pose_image_path="../assets/reference-1.png")
    results = service.generate_team_images([
        {"name": "Player 1", "position": "GK"},
        {"name": "Player 2", "position": "GK"},
        {"name": "Player 3", "position": "GK"},
        {"name": "Player 4", "position": "GK"},
        {"name": "Player 5", "position": "GK"},
        {"name": "Player 6", "position": "GK"},
        {"name": "Player 7", "position": "GK"},
        {"name": "Player 8", "position": "GK"},
        {"name": "Player 9", "position": "GK"},
        {"name": "Player 10", "position": "GK"},
        {"name": "Player 11", "position": "GK"}
    ])
    # print(results)x