import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import { Team, TeamAttributes, TeamTactic } from '@/contexts/GameContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogoStep } from '@/components/team-creation/LogoStep';
import { AttributesStep } from '@/components/team-creation/AttributesStep';
import { SummaryStep } from '@/components/team-creation/SummaryStep';

type Step = 'logo' | 'attributes' | 'summary';

const CreateTeam = () => {
  const navigate = useNavigate();
  const { createTeam } = useGame();
  const [step, setStep] = useState<Step>('logo');
  const [teamName, setTeamName] = useState('');
  const [logoType, setLogoType] = useState<'manual' | 'ai'>('manual');
  const [initials, setInitials] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#62df6e');
  const [customizedName, setCustomizedName] = useState('');
  const [generatedLogo, setGeneratedLogo] = useState<string>('');

  const [attributes, setAttributes] = useState<TeamAttributes>({
    passing: 40,
    shooting: 40,
    pace: 40,
    dribbling: 40,
    defending: 40,
    physicality: 40,
  });

  const [tactic, setTactic] = useState<TeamTactic>('Balanced');
  const TOTAL_POINTS = 60;
  const [pointsLeft, setPointsLeft] = useState(TOTAL_POINTS);
  
  useEffect(() => {
    const totalPointsUsed = Object.values(attributes).reduce((sum, value) => sum + value - 40, 0);
    setPointsLeft(TOTAL_POINTS - totalPointsUsed);
  }, [attributes]);

  const handleAttributeChange = (attr: keyof typeof attributes, newValue: number) => {
    const oldValue = attributes[attr];
    const pointDiff = newValue - oldValue;
    
    if (pointsLeft - pointDiff < 0) return;
    
    setAttributes({ ...attributes, [attr]: newValue });
    setPointsLeft(prev => prev - pointDiff);
  };

  const handleCreateTeam = () => {
    const finalName = logoType === 'manual' ? teamName : customizedName;
    
    if (logoType === 'manual') {
      createTeam({
        name: finalName,
        logo: {
          initials: logoType === 'manual' ? initials : customizedName.substring(0, 2).toUpperCase(),
          backgroundColor: logoType === 'manual' ? backgroundColor : '#62df6e',
        },
        attributes,
        tactic,
        players: [],
        userId: ''
      });
    } else {
      createTeam({
        name: finalName,
        logo: {
          image: generatedLogo,
          theme: '',
        },
        attributes,
        tactic,
        players: [],
        userId: ''
      });
    }
    navigate('/dashboard');
  };

  const handleNext = () => {
    if (step === 'logo') {
      setStep('attributes');
    } else if (step === 'attributes') {
      setStep('summary');
    }
  };

  const handleBack = () => {
    if (step === 'attributes') {
      setStep('logo');
    } else if (step === 'summary') {
      setStep('attributes');
    }
  };

  useEffect(() => {
    if (teamName && logoType === 'manual') {
      const words = teamName.split(' ');
      if (words.length === 1) {
        setInitials(words[0].substring(0, 3).toUpperCase());
      } else {
        setInitials(words.map(word => word[0]).join('').substring(0, 3).toUpperCase());
      }
    }
  }, [teamName, logoType]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-footbai-background p-4">
      <Card className="w-full max-w-3xl bg-footbai-container border-footbai-header">
        <CardHeader className="bg-footbai-header">
          <CardTitle className="text-xl text-center text-white">
            Create Your Football Club
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {step === 'logo' && (
            <LogoStep
              onNext={handleNext}
              onLogoTypeChange={setLogoType}
              logoType={logoType}
              teamName={teamName}
              onTeamNameChange={setTeamName}
              initials={initials}
              onInitialsChange={setInitials}
              backgroundColor={backgroundColor}
              onBackgroundColorChange={setBackgroundColor}
              customizedName={customizedName}
              onCustomizedNameChange={setCustomizedName}
            />
          )}

          {step === 'attributes' && (
            <AttributesStep
              onNext={handleNext}
              onBack={handleBack}
              attributes={attributes}
              onAttributeChange={handleAttributeChange}
              tactic={tactic}
              onTacticChange={setTactic}
              totalPoints={TOTAL_POINTS}
              pointsLeft={pointsLeft}
            />
          )}

          {step === 'summary' && (
            <SummaryStep
              onBack={handleBack}
              onCreateTeam={handleCreateTeam}
              teamName={logoType === 'manual' ? teamName : customizedName}
              initials={initials}
              backgroundColor={backgroundColor}
              attributes={attributes}
              tactic={tactic}
              logoType={logoType}
              generatedLogo={generatedLogo}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateTeam;