import { useState } from 'react';
import { create_club_logo } from '@/api';

export const useLogoGeneration = () => {
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [generatedLogo, setGeneratedLogo] = useState<string>('');
  const [generatedClubName, setGeneratedClubName] = useState<string>('');

  const generateLogo = async (themeTags: string[], colorTags: string[]) => {
    if (themeTags.length === 0) return;
    
    setIsGeneratingLogo(true);
    
    try {
      const response = await create_club_logo(
        themeTags.map(tag => tag.toLowerCase()),
        colorTags.map(tag => tag.toLowerCase())
      );
      console.log(response);
      
      if (response.success) {
        setGeneratedLogo(response.logo_url);
        setGeneratedClubName(response.club_name);
      }
    } catch (error) {
      console.error('Error generating logo:', error);
    } finally {
      setIsGeneratingLogo(false);
    }
  };

  const resetLogo = () => {
    setGeneratedLogo('');
    setGeneratedClubName('');
  };

  return {
    isGeneratingLogo,
    generatedLogo,
    generatedClubName,
    generateLogo,
    resetLogo
  };
}; 