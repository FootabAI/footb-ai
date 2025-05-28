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

from diffusers import StableDiffusionControlNetPipeline, ControlNetModel, DPMSolverMultistepScheduler


class PlayerImageService:
    def __init__(self, pose_image_path=None):
        self.output_dir = Path("temp_images")
        self.output_dir.mkdir(exist_ok=True)
        self.use_gpu = torch.cuda.is_available()
        self._setup_pipeline()
        if pose_image_path:
            self.pose_image = self._load_and_validate_pose_image(pose_image_path)
    
    def _setup_pipeline(self):
        """Setup DreamShaper + ControlNet pipeline"""
        controlnet = ControlNetModel.from_pretrained(
            "lllyasviel/sd-controlnet-openpose",
            torch_dtype=torch.float16 if self.use_gpu else torch.float32
        )
        
        self.pipe = StableDiffusionControlNetPipeline.from_pretrained(
            "Lykon/DreamShaper",
            controlnet=controlnet,
            torch_dtype=torch.float16 if self.use_gpu else torch.float32,
            safety_checker=None,
            requires_safety_checker=False
        )
        
        self.pipe.scheduler = DPMSolverMultistepScheduler.from_config(self.pipe.scheduler.config)
        
        if self.use_gpu:
            self.pipe = self.pipe.to("cuda")
    
    
    
    def _generate_attributes(self):
        """Generate random player attributes"""
        ethnicities = ["European", "African", "South American", "Asian", "Middle Eastern"]
        hair_colors = {"European": ["brown", "blonde", "black"], "African": ["black"], 
                      "South American": ["black", "brown"], "Asian": ["black"], "Middle Eastern": ["black", "brown"]}
        hair_styles = ["short", "buzz cut", "fade cut", "crew cut"]
        
        ethnicity = random.choice(ethnicities)
        hair_color = random.choice(hair_colors[ethnicity])
        
        return {
            "ethnicity": ethnicity,
            "hair_color": hair_color,
            "hair_style": random.choice(hair_styles),
            "age": random.choice(["young adult", "mid-twenties", "late twenties"])
        }
    
    def _create_prompt(self, attributes, player_num):
        """Create optimized prompt for DreamShaper v8 - HEAD AND SHOULDERS ONLY with WHITE BACKGROUND"""
        # Gender-appropriate hair and feature mapping
        ethnic_hair_mapping = {
            "European": ["brown", "dark brown", "blonde", "light brown", "black"],
            "African": ["black", "dark brown"],
            "South American": ["black", "dark brown", "brown"],
            "Asian": ["black", "dark brown"],
            "Middle Eastern": ["black", "dark brown", "brown"],
            "Mediterranean": ["black", "dark brown", "brown"],
            "Nordic": ["blonde", "light brown", "brown", "dark brown"],
            "Caribbean": ["black", "dark brown"],
            "North African": ["black", "dark brown", "brown"]
        }
        masculine_styles = ["short", "buzz cut", "fade cut", "crew cut", "cropped", "tapered"]
        hair_color = attributes['hair_color']
        hair_style = attributes['hair_style']
        if hair_color not in ethnic_hair_mapping.get(attributes['ethnicity'], []):
            hair_color = random.choice(ethnic_hair_mapping.get(attributes['ethnicity'], ["black", "dark brown", "brown"]))
        if hair_style not in masculine_styles:
            hair_style = random.choice(masculine_styles)
        positive = f"""
        close-up headshot portrait of a {attributes['ethnicity']} man,
        {attributes['age']}, male,
        {hair_color} {hair_style} hair,
        natural {attributes.get('facial_features', 'features')},
        looking straight ahead at camera,
        head and upper shoulders, centered composition,
        face centered in frame, plenty of space around head,
        normal proportions, human imperfections,
        genuine expression, straight-on angle, perfectly centered,
        """
        negative = """
        cropped at chin, no space around head, 
        tilted head, angled pose, side angle, rotated, 
        too close, extreme close-up, zoomed in too much, 
        torso, body, arms, hands, 
        tight crop, cropped head, cut off hair, cut off neck, 
        head too large for frame, face filling entire frame, 
        edge of frame cutting face, head touching edges, 
        fantasy, stylized, deformed, bad anatomy, 
        duplicate, text, watermark, logo, 
        dark, underexposed, overexposed, 
        feminine features
        """
        return positive.strip(), negative.strip()
    
    
    def _remove_background_ai(self, image):
        """
        Remove background from PIL image using rembg (local AI).
        Returns a transparent PNG PIL image.
        """
        try:
            from rembg import remove
            import numpy as np
            # Convert PIL image to numpy array
            img_np = np.array(image)
            # Remove background
            result_np = remove(img_np)
            # Convert back to PIL image
            from PIL import Image
            result_img = Image.fromarray(result_np)
            return result_img
        except Exception as e:
            print(f"AI background removal failed: {e}")
            return image
    
    def _load_and_validate_pose_image(self, pose_image_path):
        """Load and validate pose reference image for ControlNet."""
        if not os.path.exists(pose_image_path):
            raise FileNotFoundError(f"Pose file not found: {pose_image_path}")
        pose_image = Image.open(pose_image_path)
        if pose_image.mode != 'RGB':
            pose_image = pose_image.convert('RGB')
        # Resize to 256x256 if not already
        if pose_image.size != (256, 256):
            pose_image = pose_image.resize((256, 256), Image.Resampling.LANCZOS)
        return pose_image
    
    def generate_team_images(self, team_data: List[Dict]) -> List[Dict]:
        """Generate 11 player images and return base64 data"""
        results = []
        
        for i, player in enumerate(team_data[:len(team_data)]):  # Only 11 players
            print(f"Generating player {i+1}/{len(team_data)}: {player['name']}")
            
            # Generate attributes and image
            attributes = self._generate_attributes()
            positive_prompt, negative_prompt = self._create_prompt(attributes, i+1)
            
            try:
                # Generate image
                result = self.pipe(
                    prompt=positive_prompt,
                    negative_prompt=negative_prompt,
                    image=self.pose_image,
                    num_inference_steps=30,
                    guidance_scale=6.5,
                    controlnet_conditioning_scale=1.0,
                    width=256,
                    height=256,
                    generator=torch.Generator("cuda" if self.use_gpu else "cpu").manual_seed(random.randint(1, 1000000))
                )
                
                image = result.images[0]
                
                # Remove background and convert to base64
                image_no_bg = self._remove_background_ai(image)
                
                # Save locally for testing
                filename = f"test_player_{i+1:02d}_{player['name'].replace(' ', '_')}.png"
                filepath = self.output_dir / filename
                image_no_bg.save(filepath, "PNG")
                print(f"💾 Saved: {filepath}")
                
                buffer = io.BytesIO()
                image_no_bg.save(buffer, format="PNG")
                buffer.seek(0)
                image_b64 = base64.b64encode(buffer.getvalue()).decode()
                
                # Add to results
                results.append({
                    "name": player["name"],
                    "position": player["position"],
                    "image_base64": image_b64,
                    "attributes": attributes
                })
                
            except Exception as e:
                print(f"Failed to generate player {i+1}: {e}")
                continue
        
        return results
      
if __name__ == "__main__":
    service = PlayerImageService(pose_image_path="../assets/reference-1.png")
    results = service.generate_team_images([
        {"name": "Player 1", "position": "GK"},
        {"name": "Player 2", "position": "GK"},
        {"name": "Player 3", "position": "GK"},

    ])
    # print(results)