import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame, TeamTactic } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TeamLogo from '@/components/TeamLogo';
import AttributesDisplay from '@/components/AttributesDisplay';
import TeamAttributesForm from '@/components/TeamAttributesForm';
import { Shield, Sword, ShieldHalf, ArrowRight, Flame, Target, CircleDot, Sparkles, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import TagInput from '@/components/TagInput';
import { API_URL, create_club_logo } from '@/api';

const CreateTeam = () => {
  const navigate = useNavigate();
  const { createTeam } = useGame();
  const [step, setStep] = useState<'logo' | 'attributes' | 'summary'>('logo');
  const [teamName, setTeamName] = useState('');
  const [logoType, setLogoType] = useState<'manual' | 'ai'>('manual');
  const [initials, setInitials] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#62df6e');

  const [themeTags, setThemeTags] = useState<string[]>([]);
  const [colorTags, setColorTags] = useState<string[]>([]);
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [generatedLogo, setGeneratedLogo] = useState<string>('');
  const [generatedClubName, setGeneratedClubName] = useState<string>('');
  const [customizedName, setCustomizedName] = useState('');

  const [tactic, setTactic] = useState<TeamTactic>('Balanced');
  const TOTAL_POINTS = 300;
  const [pointsLeft, setPointsLeft] = useState(TOTAL_POINTS);
  
  const [attributes, setAttributes] = useState({
    passing: 40,
    shooting: 40,
    pace: 40,
    dribbling: 40,
    defending: 40,
    physicality: 40,
  });

  const DEFAULT_AI_COLOR = '#62df6e'; // Default color for AI-generated logos

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

  const tacticIcons = {
    'Balanced': <ShieldHalf className="h-4 w-4" />,
    'Offensive': <Sword className="h-4 w-4" />,
    'Defensive': <Shield className="h-4 w-4" />,
    'Counter-Attacking': <ArrowRight className="h-4 w-4" />,
    'Aggressive': <Flame className="h-4 w-4" />,
    'Possession-Based': <Target className="h-4 w-4" />,
  };

  const handleCreateTeam = () => {
    const finalName = logoType === 'manual' ? teamName : customizedName;
    
    createTeam({
      name: finalName,
      logo: {
        initials: logoType === 'manual' ? initials : customizedName.substring(0, 2).toUpperCase(),
        backgroundColor: logoType === 'manual' ? backgroundColor : DEFAULT_AI_COLOR,
        type: logoType,
        theme: logoType === 'ai' ? themeTags.join(", ") : undefined,
      },
      attributes,
      tactic,
    });
    navigate('/dashboard');
  };

  const handleNext = () => {
    if (step === 'logo' && 
        ((logoType === 'manual' && teamName.trim() && initials.trim()) || 
         (logoType === 'ai' && customizedName.trim()))) {
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

  const generateAILogo = async () => {
    if (themeTags.length === 0) return;
    
    setIsGeneratingLogo(true);
    
    try {
      const response = await create_club_logo(
        themeTags.map(tag => tag.toLowerCase()),
        colorTags.map(tag => tag.toLowerCase())
      );
      
      if (response.success) {
        setGeneratedLogo(response.logo_url);
        setGeneratedClubName(response.club_name);
        setCustomizedName(response.club_name); // Set the initial club name
      }
    } catch (error) {
      console.error('Error generating logo:', error);
    } finally {
      setIsGeneratingLogo(false);
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
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-lg font-semibold">Team Design</h2>
              
              <Tabs defaultValue="manual" value={logoType} onValueChange={(v) => setLogoType(v as 'manual' | 'ai')}>
                <TabsList className="bg-footbai-header">
                  <TabsTrigger value="manual" className="data-[state=active]:bg-footbai-accent data-[state=active]:text-black">
                    Manual Design
                  </TabsTrigger>
                  <TabsTrigger value="ai" className="data-[state=active]:bg-footbai-accent data-[state=active]:text-black">
                    AI Generated
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="manual" className="space-y-4 mt-4">
                  <div className="flex justify-center mb-6">
                    <TeamLogo 
                      logo={{ 
                        initials, 
                        backgroundColor, 
                        type: 'manual' 
                      }} 
                      size="xl" 
                      className="!w-48 !h-48"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="team-name">Enter your team name</Label>
                    <Input
                      id="team-name"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="e.g., FC Barcelona"
                      className="bg-footbai-header border-footbai-hover focus:ring-footbai-accent"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="initials">Team Initials (1-3 letters)</Label>
                    <Input
                      id="initials"
                      value={initials}
                      onChange={(e) => setInitials(e.target.value.substring(0, 3).toUpperCase())}
                      placeholder="FCB"
                      maxLength={3}
                      className="bg-footbai-header border-footbai-hover focus:ring-footbai-accent"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="color">Background Color</Label>
                    <div className="flex gap-3 items-center">
                      <Input
                        id="color"
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="w-16 h-10 p-1 cursor-pointer bg-footbai-header border-footbai-hover"
                      />
                      <Input 
                        value={backgroundColor} 
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="bg-footbai-header border-footbai-hover focus:ring-footbai-accent"
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="ai" className="space-y-4 mt-4">
                  {!generatedLogo ? (
                    <div className="space-y-4">
                      <div className="flex justify-center mb-6">
                        <TeamLogo 
                          logo={{ 
                            initials: "", 
                            backgroundColor: DEFAULT_AI_COLOR, 
                            type: 'ai' 
                          }} 
                          size="xl"
                          className="!w-48 !h-48"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="theme-tags">Theme Tags (Max 2)</Label>
                        <TagInput
                          tags={themeTags}
                          onTagsChange={(tags) => setThemeTags(tags.slice(0, 2))}
                          placeholder="e.g., lion, shield"
                          maxTags={2}
                          className="bg-footbai-header border-footbai-hover focus:ring-footbai-accent"
                        />
                        <p className="text-sm text-muted-foreground mt-1">Add up to 2 themes for your logo</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="color-tags">Color Tags (Max 3)</Label>
                        <TagInput
                          tags={colorTags}
                          onTagsChange={(tags) => setColorTags(tags.slice(0, 3))}
                          placeholder="e.g., blue, red, gold"
                          maxTags={3}
                          className="bg-footbai-header border-footbai-hover focus:ring-footbai-accent"
                        />
                        <p className="text-sm text-muted-foreground mt-1">Add up to 3 colors for your logo</p>
                      </div>
                      
                      <Button 
                        onClick={generateAILogo}
                        disabled={isGeneratingLogo || themeTags.length === 0}
                        className="bg-footbai-accent hover:bg-footbai-accent/80 text-black font-medium w-full mt-4"
                      >
                        {isGeneratingLogo ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate Logo
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-center mb-6">
                        <img 
                          src={generatedLogo} 
                          alt="Generated Logo" 
                          className="w-48 h-48 object-contain rounded-full bg-transparent"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="team-name">Team Name</Label>
                        <Input
                          id="team-name"
                          value={customizedName}
                          onChange={(e) => setCustomizedName(e.target.value)}
                          placeholder="Customize the generated team name"
                          className="bg-footbai-header border-footbai-hover focus:ring-footbai-accent"
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          AI suggested: {generatedClubName}
                        </p>
                      </div>
                      
                      <Button 
                        onClick={() => {
                          setGeneratedLogo('');
                          setGeneratedClubName('');
                          setCustomizedName('');
                          setThemeTags([]);
                          setColorTags([]);
                        }}
                        variant="outline"
                        className="w-full border-footbai-header hover:bg-footbai-hover"
                      >
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Start Over
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}

          {step === 'attributes' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-lg font-semibold">Team Attributes</h2>
              
              <TeamAttributesForm
                attributes={attributes}
                onChange={handleAttributeChange}
                totalPoints={TOTAL_POINTS}
                pointsLeft={pointsLeft}
              />
              
              <div className="space-y-2 mt-8">
                <Label htmlFor="tactic">Team Tactic</Label>
                <Select value={tactic} onValueChange={(value) => setTactic(value as TeamTactic)}>
                  <SelectTrigger id="tactic" className="bg-footbai-header border-footbai-hover focus:ring-footbai-accent">
                    <div className="flex items-center gap-2">
                      {tactic && tacticIcons[tactic]}
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-footbai-container border-footbai-hover">
                    {Object.keys(tacticIcons).map((tacticName) => (
                      <SelectItem key={tacticName} value={tacticName} className="flex items-center gap-2">
                        {tacticIcons[tacticName as keyof typeof tacticIcons]}
                        <span>{tacticName}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 'summary' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-lg font-semibold">Team Summary</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-footbai-header p-4 rounded-lg">
                    <h3 className="text-footbai-accent font-medium mb-2">Team Info</h3>
                    <div className="flex items-center space-x-4">
                      <TeamLogo 
                        logo={{ 
                          initials: logoType === 'manual' ? initials : customizedName.substring(0, 2).toUpperCase(), 
                          backgroundColor: logoType === 'manual' ? backgroundColor : DEFAULT_AI_COLOR, 
                          type: logoType,
                          theme: logoType === 'ai' ? themeTags.join(", ") : undefined
                        }} 
                        size="lg" 
                      />
                      <div>
                        <p className="font-bold text-lg">{logoType === 'manual' ? teamName : customizedName}</p>
                        <p className="text-sm text-gray-400">{tactic} Tactic</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-footbai-header p-4 rounded-lg">
                    <h3 className="text-footbai-accent font-medium mb-3">Team Attributes</h3>
                    <AttributesDisplay 
                      attributes={attributes} 
                      teamColor={logoType === 'manual' ? backgroundColor : DEFAULT_AI_COLOR} 
                    />
                  </div>
                </div>
                
                <div className="bg-footbai-header p-4 rounded-lg">
                  <h3 className="text-footbai-accent font-medium mb-3">Starting Benefits</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center">
                      <span className="w-2 h-2 rounded-full bg-footbai-accent mr-2"></span>
                      Initial team with 11 players
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 rounded-full bg-footbai-accent mr-2"></span>
                      100 points to use for upgrades
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 rounded-full bg-footbai-accent mr-2"></span>
                      Access to 1 opponent for matches
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 rounded-full bg-footbai-accent mr-2"></span>
                      Full match simulation experience
                    </li>
                  </ul>
                  
                  <div className="mt-8 p-3 bg-black/30 rounded border border-footbai-accent/30">
                    <p className="text-sm text-footbai-accent">
                      Ready to start your journey? Create your team and begin playing matches!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8">
            {step !== 'logo' && (
              <Button onClick={handleBack} variant="outline" className="border-footbai-header hover:bg-footbai-hover">
                Back
              </Button>
            )}
            
            <Button 
              onClick={step !== 'summary' ? handleNext : handleCreateTeam} 
              className="bg-footbai-accent hover:bg-footbai-accent/80 text-black font-medium"
              disabled={
                (step === 'logo' && logoType === 'manual' && (!teamName.trim() || !initials.trim())) ||
                (step === 'logo' && logoType === 'ai' && !customizedName)
              }
            >
              {step !== 'summary' ? 'Next' : 'Create Team'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateTeam;