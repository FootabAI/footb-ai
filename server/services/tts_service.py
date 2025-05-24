"""
Text-to-Speech service using ElevenLabs API.
Handles conversion of match commentary text to speech.
"""

import os
import uuid
from pathlib import Path
from typing import Optional
from elevenlabs import VoiceSettings
from elevenlabs.client import ElevenLabs

class TTSService:
    def __init__(self):
        # Set up ElevenLabs API key
        self.api_key = os.getenv("ELEVENLABS_API_KEY")
        if self.api_key:
            self.client = ElevenLabs(api_key=self.api_key)
            self.is_available = True
        else:
            self.is_available = False
            print("Warning: ELEVENLABS_API_KEY not found. TTS will be disabled.")

        # Create temp directory for audio files
        self.temp_dir = Path("temp_audio")
        self.temp_dir.mkdir(exist_ok=True)

        # Default voice settings
        self.voice_id = "WyvvvfISz1Hv4BXYALZP"  # Custom commentator voice
        self.model_id = "eleven_monolingual_v1"  # Using the standard model instead of turbo

        # Cache for generated audio files
        self.audio_cache = {}

    async def generate_audio(self, text: str, event_type: str = "default") -> Optional[str]:
        """
        Generate audio for the given text and return the audio URL.
        Returns None if TTS is not available or if there's an error.
        """
        if not self.is_available:
            return None

        # Check cache first
        if text in self.audio_cache:
            return self.audio_cache[text]

        try:
            # Generate audio using ElevenLabs
            response = self.client.text_to_speech.convert(
                voice_id=self.voice_id,
                output_format="mp3_22050_32",
                text=text,
                model_id=self.model_id,
                voice_settings=VoiceSettings(
                    stability=0.05,  # expressiveness
                    similarity_boost=0.2,  # Lower for more dramatic variation
                    style=0.99,  # Maximum style for dramatic delivery
                    use_speaker_boost=True,
                    speed=1.2  # Maximum allowed speed for excitement
                ),
            )
 
            # Generate a unique filename
            filename = f"commentary_{uuid.uuid4()}.mp3"
            filepath = self.temp_dir / filename

            # Save the audio file
            with open(filepath, "wb") as f:
                for chunk in response:
                    if chunk:
                        f.write(chunk)

            # Create relative URL for the audio file
            audio_url = f"/audio/{filename}"

            # Cache the URL
            self.audio_cache[text] = audio_url

            return audio_url

        except Exception as e:
            print(f"Error generating TTS: {e}")
            return None

    def clear_cache(self):
        """Clear the audio cache and remove temporary files."""
        self.audio_cache.clear()
        for file in self.temp_dir.glob("*.mp3"):
            try:
                file.unlink()
            except Exception as e:
                print(f"Error deleting file {file}: {e}") 