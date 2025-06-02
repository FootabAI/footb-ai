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
import json
import shutil
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Check for OpenAI API key
if not os.getenv("OPENAI_API_KEY"):
    raise ValueError("Please set the OPENAI_API_KEY environment variable")

class LogoService:
    def __init__(self, reference_images_dir: str):
        self.reference_images_dir = reference_images_dir
        self.embeddings = OpenAIEmbeddings(openai_api_key=os.getenv("OPENAI_API_KEY"))
        self.llm = ChatOpenAI(temperature=0.7, openai_api_key=os.getenv("OPENAI_API_KEY"))
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.vector_store = self._initialize_vector_store()

    def _initialize_vector_store(self) -> FAISS:
        """Initialize the vector store with reference images."""
        # Create a list to store image metadata and embeddings
        image_metadata = []
        
        # Process each image in the reference directory
        for filename in os.listdir(self.reference_images_dir):
            if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                image_path = os.path.join(self.reference_images_dir, filename)
                try:
                    # Load and process the image
                    image = Image.open(image_path)
                    main_color = self.get_main_color(image)
                    
                    # Try to load custom description from JSON file
                    description = None
                    json_path = os.path.join(self.reference_images_dir, 'descriptions.json')
                    if os.path.exists(json_path):
                        with open(json_path, 'r') as f:
                            descriptions = json.load(f)
                            if filename in descriptions:
                                description = descriptions[filename]
                    
                    # If no custom description, create a basic one
                    if not description:
                        description = f"A minimalist logo with main color {main_color}"
                    
                    # Store metadata
                    image_metadata.append({
                        "filename": filename,
                        "description": description,
                        "main_color": main_color
                    })
                except Exception as e:
                    print(f"Error processing image {filename}: {str(e)}")
        
        # Create embeddings for the descriptions
        texts = [item["description"] for item in image_metadata]
        embeddings = self.embeddings.embed_documents(texts)
        
        # Create the vector store
        vector_store = FAISS.from_embeddings(
            text_embeddings=list(zip(texts, embeddings)),
            embedding=self.embeddings,
            metadatas=image_metadata
        )
        
        return vector_store

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

    def generate_club_name(self, themes: Optional[List[str]] = None) -> str:
        """Generate a creative and unique football club name based on themes."""
        template = """Generate a SINGLE creative and unique football club name that captures the essence of the themes.
        {theme_prompt}
        
        Guidelines:
        1. Return ONLY ONE club name - no numbering, no multiple options
        2. Be creative and avoid obvious combinations (e.g., don't just add 'FC' to the themes)
        3. Consider historical, mythological, or cultural references related to the themes
        4. Use evocative words that capture the spirit of the themes
        5. Consider using:
           - Ancient names or titles
           - Mythological figures
           - Historical locations
           - Symbolic elements
           - Powerful adjectives
        6. The name should be memorable and have a strong identity
        7. If multiple themes are provided, create a name that combines elements from both themes in a creative way
        
        Examples of good single responses for Viking + Sun themes:
        "Solar Ragnarok"
        "Odin's Dawn"
        "Valhalla Rising"
        
        Examples of good single responses for Strong + Fire themes:
        "Iron Phoenix"
        "Steel Inferno"
        "Atlas Flame"
        
        IMPORTANT: Return ONLY the club name, nothing else. No numbering, no additional text.
        """
        
        theme_prompt = f"Themes: {', '.join(themes)}" if themes else "No specific themes provided"
        
        prompt = PromptTemplate(
            input_variables=["theme_prompt"],
            template=template
        )
        
        chain = prompt | self.llm
        return chain.invoke({"theme_prompt": theme_prompt}).content.strip()

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
        4. The style and design approach (e.g., "minimalist", "modern", "traditional")
        
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
        themes: Optional[List[str]] = None,
        colors: Optional[List[str]] = None,
        style_preference: Optional[str] = None
    ) -> Tuple[str, str, str, str]:
        """Generate a club name, logo description, logo image, and main color."""
        # First, find similar logos for inspiration
        color_str = ', '.join(colors) if colors else "any colors"
        theme_str = ' and '.join(themes) if themes else "any theme"
        query = f"Logo with themes: {theme_str} and colors: {color_str}"
        similar_logos = self.get_similar_logos(query, k=2)
        
        # Extract design elements and styles from similar logos
        design_elements = []
        styles = []
        for logo in similar_logos:
            # Parse the description to extract elements
            desc = logo["description"].lower()
            if "shield" in desc: design_elements.append("shield")
            if "circle" in desc: design_elements.append("circle")
            if "geometric" in desc: design_elements.append("geometric")
            if "minimalist" in desc: styles.append("minimalist")
            if "modern" in desc: styles.append("modern")
            if "traditional" in desc: styles.append("traditional")
        
        # Generate club name
        club_name = self.generate_club_name(themes)
        
        # Create an enhanced logo description that incorporates similar design elements
        design_elements_str = ", ".join(set(design_elements)) if design_elements else ""
        style_str = ", ".join(set(styles)) if styles else style_preference or "modern"
        
        # Generate logo description with inspiration from similar logos
        logo_description = self.generate_logo_description(
            club_name=club_name,
            colors=colors,
            style_preference=f"{style_str} with {design_elements_str} elements" if design_elements_str else style_str
        )
        
        # Generate the logo image
        logo_url, main_color = self.generate_logo_image(logo_description)
        
        return club_name, logo_description, logo_url, main_color

    def get_similar_logos(self, query: str, k: int = 3) -> List[Dict[str, Any]]:
        """Find similar logos based on the query."""
        # Get similar documents from the vector store
        similar_docs = self.vector_store.similarity_search_with_score(query, k=k)
        
        # Format the results to match the SimilarLogo model
        results = []
        for doc, score in similar_docs:
            # Create the path to the image
            image_path = os.path.join(self.reference_images_dir, doc.metadata["filename"])
            
            # Add to results with the correct format
            results.append({
                "path": image_path,
                "similarity": float(score),
                "description": doc.metadata.get("description", "")
            })
        
        return results

if __name__ == "__main__":
    # ---- USER INPUT ----
    themes = ["Wolf"] 
    colors = ["Orange", "Black"]       

    # ---- SETUP ----
    print("Initializing LogoService...")
    # Get the directory where the script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    images_dir = os.path.join(script_dir, "images")
    output_dir = os.path.join(script_dir, "output")
    
    logo_service = LogoService(images_dir)
    os.makedirs(output_dir, exist_ok=True)

    # ---- FIND SIMILAR LOGO ----
    # Use the theme and colors to form a query
    color_str = ', '.join(colors)
    query = f"Minimalist logo with theme: {', '.join(themes)} and colors: {color_str}"
    results = logo_service.get_similar_logos(query, k=1)

    if results:
        result = results[0]
        # Save JSON result
        result_path = os.path.join(output_dir, "similar_logo_result.json")
        with open(result_path, 'w') as f:
            json.dump(result, f, indent=2)
        # Copy the similar image
        source_path = result['path']
        dest_path = os.path.join(output_dir, f"similar_logo{os.path.splitext(os.path.basename(source_path))[1]}")
        shutil.copy2(source_path, dest_path)
        print(f"Similar logo and result saved to {output_dir}/")
    else:
        print("No similar logo found.")
        exit(1)

    # ---- GENERATE NEW LOGO ----
    club_name, logo_description, logo_url, main_color = logo_service.generate_club(
        themes=themes,
        colors=colors,
        style_preference="minimalist"
    )
    # Save the generated logo image
    logo_data = logo_url.split(',')[1]
    logo_bytes = base64.b64decode(logo_data)
    generated_logo_path = os.path.join(output_dir, "generated_logo.png")
    with open(generated_logo_path, "wb") as f:
        f.write(logo_bytes)
    print(f"Generated logo saved to {generated_logo_path}")
    