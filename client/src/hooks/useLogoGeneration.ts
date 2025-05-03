import { useState } from 'react';
import { create_club_logo } from '@/api';
import { useOnboardingStore } from '@/stores/useOnboardingStore';

export const useLogoGeneration = () => {
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [generatedLogo, setGeneratedLogo] = useState<string>('');
  const [generatedClubName, setGeneratedClubName] = useState<string>('');
  const setMainColor = useOnboardingStore(state => state.setMainColor);

  const generateLogo = async (themeTags: string[], colorTags: string[]) => {
    if (themeTags.length === 0) return;
    
    setIsGeneratingLogo(true);
    
    try {
      const response = await create_club_logo(
        themeTags.map(tag => tag.toLowerCase()),
        colorTags.map(tag => tag.toLowerCase())
      );
      
      console.log('Logo generation response:', response);
      
      if (response.success) {
        setGeneratedLogo(response.logo_url);
        setGeneratedClubName(response.club_name);
        if (response.main_color) {
          console.log('Setting main color to:', response.main_color);
          setMainColor(response.main_color);
        }
      }
    } catch (error) {
      console.error('Error generating logo:', error);
      throw error;
    } finally {
      setIsGeneratingLogo(false);
    }
  };

  const resetLogo = () => {
    setGeneratedLogo('');
    setGeneratedClubName('');
    setMainColor('#62df6e');
  };

  return {
    isGeneratingLogo,
    generatedLogo,
    generatedClubName,
    generateLogo,
    resetLogo
  };
}; 