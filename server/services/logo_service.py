import os
import numpy as np
from PIL import Image, ImageDraw
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any, Tuple, Optional
from openai import OpenAI
import base64
from io import BytesIO
import requests

class LogoService:
    def __init__(self, reference_images_dir: str):
        self.reference_images_dir = reference_images_dir
        self.embeddings = OpenAIEmbeddings()
        self.llm = ChatOpenAI(temperature=0.7)
        self.image_model = SentenceTransformer('clip-ViT-B-32')
        self.vector_store = self._setup_vector_store()
        self.client = OpenAI()

    def _setup_vector_store(self) -> FAISS:
        """Set up the vector store with reference images."""
        documents = []
        metadatas = []
        
        for filename in os.listdir(self.reference_images_dir):
            if filename.endswith(('.png', '.jpg', '.jpeg')):
                image_path = os.path.join(self.reference_images_dir, filename)
                image = Image.open(image_path)
                image_embedding = self.image_model.encode(image)
                documents.append(filename)
                metadatas.append({"path": image_path})
        
        if not documents:
            raise ValueError("No images found in the reference directory")
            
        text_embeddings = list(zip(documents, [self.image_model.encode(doc) for doc in documents]))
        return FAISS.from_embeddings(
            text_embeddings=text_embeddings,
            embedding=self.image_model.encode,
            metadatas=metadatas
        )

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
        template = """Create a description for a football club logo that will be used to generate an image.
        Club Name: {club_name}
        {colors_prompt}
        {style_prompt}
        
        CRITICAL REQUIREMENTS - DO NOT DEVIATE FROM THESE:
        1. ABSOLUTELY NO TEXT - The logo must not contain any letters, numbers, words, or text of any kind
        2. EXTREMELY SIMPLE DESIGN - Use only basic geometric shapes (circles, triangles, squares)
        3. MINIMAL DETAILS - No complex patterns, no gradients, no shadows, no 3D effects
        4. FLAT DESIGN ONLY - Everything must be flat, no depth or perspective
        5. MAXIMUM 3 SHAPES - Use no more than 3 simple geometric shapes
        6. NO SYMBOLS - Do not use any recognizable symbols or icons
        7. NO ANIMALS OR OBJECTS - Do not include any animal or object representations
        
        The description should be very simple and include:
        1. The basic geometric shapes to use (circle, triangle, square, etc.)
        2. How these shapes are arranged (e.g., "circle inside a square")
        3. The colors to use for each shape
        
        Example of a good description:
        "A simple circle inside a square. The circle is blue and the square is white."
        
        Make the description extremely simple and clear.
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

    def generate_logo_image(self, description: str) -> str:
        """Generate a logo image using DALL-E based on the description."""
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
            
            image = image.convert('RGBA')
            
            mask = Image.new('L', image.size, 0)
            draw = ImageDraw.Draw(mask)
            draw.ellipse((0, 0, image.size[0], image.size[1]), fill=255)
            
            output = Image.new('RGBA', image.size, (0, 0, 0, 0))
            output.paste(image, mask=mask)
            
            buffered = BytesIO()
            output.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode()
            
            return f"data:image/png;base64,{img_str}"
            
        except Exception as e:
            raise Exception(f"Error generating logo image: {str(e)}")

    def generate_club(
        self,
        location: Optional[str] = None,
        theme: Optional[str] = None,
        colors: Optional[List[str]] = None,
        style_preference: Optional[str] = None
    ) -> Tuple[str, str, str]:
        """Generate a club name, logo description, and logo image."""
        club_name = self.generate_club_name(location, theme)
        logo_description = self.generate_logo_description(club_name, colors, style_preference)
        logo_url = self.generate_logo_image(logo_description)
        
        return club_name, logo_description, logo_url

    def get_similar_logos(self, query: str, k: int = 3) -> List[Dict[str, Any]]:
        """Find similar logos based on the query."""
        query_embedding = self.image_model.encode(query)
        
        similar_docs = self.vector_store.similarity_search_by_vector(
            query_embedding,
            k=k
        )
        
        return [
            {
                "path": str(doc.metadata["path"]),
                "similarity": float(1.0)
            }
            for doc in similar_docs
        ] 