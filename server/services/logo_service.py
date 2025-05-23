import os
import numpy as np
from PIL import Image, ImageDraw
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from typing import List, Dict, Any, Tuple, Optional
from openai import OpenAI
import base64
from io import BytesIO
import requests
from collections import Counter


class LogoService:
    def __init__(self, reference_images_dir: str):
        self.reference_images_dir = reference_images_dir
        self.embeddings = OpenAIEmbeddings()
        self.llm = ChatOpenAI(temperature=0.7)
        self.client = OpenAI()

    def get_main_color(self, image: Image.Image) -> str:
        """Extract the most visually prominent (vivid) color from the image, ignoring background and dark/desaturated colors."""
        if image.mode != 'RGB':
            image = image.convert('RGB')
        img = image.resize((128, 128))  # Downsample for speed
        arr = np.array(img).reshape(-1, 3)

        # 1. Detect background color (sample corners)
        corners = np.concatenate([
            arr[0:10], arr[-10:], arr[::128][:10], arr[::128][-10:]
        ])
        bg_color = tuple(np.median(corners, axis=0).astype(int))

        # 2. Remove background and dark/desaturated pixels
        def is_valid_color(rgb):
            r, g, b = rgb
            brightness = (r * 299 + g * 587 + b * 114) / 1000
            max_val = max(r, g, b)
            min_val = min(r, g, b)
            saturation = (max_val - min_val) / max_val if max_val else 0
            # Ignore background (within tolerance), dark, and grayish
            if np.linalg.norm(np.array(rgb) - np.array(bg_color)) < 30:
                return False
            if brightness < 60:
                return False
            if saturation < 0.25:
                return False
            return True

        valid_pixels = np.array([p for p in arr if is_valid_color(p)])
        if len(valid_pixels) == 0:
            return '#62df6e'

        # 3. Cluster colors and pick the most vivid
        try:
            from sklearn.cluster import KMeans
            n_clusters = min(3, len(valid_pixels))
            kmeans = KMeans(n_clusters=n_clusters, random_state=0).fit(valid_pixels)
            cluster_centers = kmeans.cluster_centers_.astype(int)
            # Score by vividness (saturation + brightness)
            def color_score(rgb):
                r, g, b = rgb
                brightness = (r * 299 + g * 587 + b * 114) / 1000
                max_val = max(rgb)
                min_val = min(rgb)
                saturation = (max_val - min_val) / max_val if max_val else 0
                return saturation * 2 + brightness / 255
            main_color = max(cluster_centers, key=color_score)
        except Exception:
            # Fallback: most common valid color
            main_color = Counter(map(tuple, valid_pixels)).most_common(1)[0][0]

        return '#{:02x}{:02x}{:02x}'.format(*main_color)

    def generate_club_name(self, location: Optional[str] = None, theme: Optional[str] = None) -> str:
        """Generate a football club name based on location and theme."""
        template = """Generate a creative and unique football club name.
        {location_prompt}
        {theme_prompt}
        The name should be memorable and reflect the local identity or theme if provided.
        Only return the club name, nothing else.
        """
        
        location_prompt = f"Location: {location}" if location else ""
        theme_prompt = f"Theme: {theme}" if theme else ""
        
        prompt = PromptTemplate(
            input_variables=["location_prompt", "theme_prompt"],
            template=template
        )
        
        chain = prompt | self.llm
        return chain.invoke({"location_prompt": location_prompt, "theme_prompt": theme_prompt}).content.strip()

    def generate_logo_description(self, club_name: str, colors: Optional[List[str]] = None, style_preference: Optional[str] = None) -> str:
        """Generate a detailed logo description for DALL-E."""
        template = """Create a description for a professional football club logo that will be used to generate an image.
        Club Name: {club_name}
        {colors_prompt}
        {style_prompt}
        
        CRITICAL REQUIREMENTS - DO NOT DEVIATE FROM THESE:
        1. ABSOLUTELY NO TEXT OR LETTERS - The logo must not contain:
           - No letters, numbers, or words
           - No initials or abbreviations
           - No text of any kind, even stylized
           - No symbols that could be mistaken for letters
        2. CLEAN DESIGN - Use simple, bold shapes and elements that are easily recognizable
        3. MINIMAL DETAILS - Avoid complex patterns, gradients, or 3D effects
        4. FLAT DESIGN - Keep the design flat and modern
        5. MAXIMUM 3 MAIN ELEMENTS - Focus on 2-3 key elements that represent the theme
        6. PROFESSIONAL LOOK - Must look like a real football club logo
        
        The description should include:
        1. The main theme elements (e.g., for Greek/Poseidon: trident, waves, or Greek column)
        2. How these elements are arranged (e.g., "trident centered with wave elements around it")
        3. The colors to use for each element
        
        Example for Greek/Poseidon theme:
        "A bold, stylized trident in the center with subtle wave elements around it. The trident is gold and the waves are deep blue."
        
        Example for Viking theme:
        "A simplified Viking helmet with crossed axes behind it. The helmet is silver and the axes are dark gray."
        
        BAD EXAMPLES (DO NOT USE):
        - "A shield with the letters FC in the center" (contains text)
        - "A lion with the team's initials below it" (contains text)
        - "A stylized letter M made of waves" (contains text)
        - "A trident with the word 'Poseidon' around it" (contains text)
        
        Make the description clear and focused on the theme while keeping it simple and professional.
        Only return the description, nothing else.
        """
        
        colors_prompt = f"Colors: {', '.join(colors)}" if colors else ""
        style_prompt = f"Style: {style_preference}" if style_preference else ""
        
        prompt = PromptTemplate(
            input_variables=["club_name", "colors_prompt", "style_prompt"],
            template=template
        )
        
        chain = prompt | self.llm
        return chain.invoke({
            "club_name": club_name,
            "colors_prompt": colors_prompt,
            "style_prompt": style_prompt
        }).content.strip()

    def generate_logo_image(self, description: str) -> Tuple[str, str]:
        """Generate a logo image using DALL-E based on the description and return both the image and main color."""
        try:
            response = self.client.images.generate(
                model="dall-e-3",
                prompt=f"Create a professional football club logo with the following description: {description}",
                size="1024x1024",
                quality="standard",
                n=1,
            )
            
            image_url = response.data[0].url
            image_response = requests.get(image_url)
            image = Image.open(BytesIO(image_response.content))
            
            # Get main color before processing the image
            main_color = self.get_main_color(image)
            
            image = image.convert('RGBA')
            
            mask = Image.new('L', image.size, 0)
            draw = ImageDraw.Draw(mask)
            draw.ellipse((0, 0, image.size[0], image.size[1]), fill=255)
            
            output = Image.new('RGBA', image.size, (0, 0, 0, 0))
            output.paste(image, mask=mask)
            
            buffered = BytesIO()
            output.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode()
            
            return f"data:image/png;base64,{img_str}", main_color
            
        except Exception as e:
            raise Exception(f"Error generating logo image: {str(e)}")

    def generate_club(
        self,
        location: Optional[str] = None,
        theme: Optional[str] = None,
        colors: Optional[List[str]] = None,
        style_preference: Optional[str] = None
    ) -> Tuple[str, str, str, str]:
        """Generate a club name, logo description, logo image, and main color."""
        club_name = self.generate_club_name(location, theme)
        logo_description = self.generate_logo_description(club_name, colors, style_preference)
        logo_url, main_color = self.generate_logo_image(logo_description)
        
        return club_name, logo_description, logo_url, main_color

    def get_similar_logos(self, query: str, k: int = 3) -> List[Dict[str, Any]]:
        """Find similar logos based on the query."""
        # Since we're not using vector store anymore, return an empty list
        return [] 