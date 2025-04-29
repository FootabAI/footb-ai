import { useState } from 'react';
import { useLogoGeneration } from '@/hooks/useLogoGeneration';
import TeamLogo from '@/components/TeamLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Sparkles, ChevronLeft } from 'lucide-react';
import TagInput from '@/components/TagInput';

interface LogoStepProps {
  onNext: () => void;
  onLogoTypeChange: (type: 'manual' | 'ai') => void;
  logoType: 'manual' | 'ai';
  teamName: string;
  onTeamNameChange: (name: string) => void;
  initials: string;
  onInitialsChange: (initials: string) => void;
  backgroundColor: string;
  onBackgroundColorChange: (color: string) => void;
  customizedName: string;
  onCustomizedNameChange: (name: string) => void;
}

const DEFAULT_AI_COLOR = '#62df6e';

export const LogoStep = ({
  onNext,
  onLogoTypeChange,
  logoType,
  teamName,
  onTeamNameChange,
  initials,
  onInitialsChange,
  backgroundColor,
  onBackgroundColorChange,
  customizedName,
  onCustomizedNameChange,
}: LogoStepProps) => {
  const [themeTags, setThemeTags] = useState<string[]>([]);
  const [colorTags, setColorTags] = useState<string[]>([]);
  const { isGeneratingLogo, generatedLogo, generatedClubName, generateLogo, resetLogo } = useLogoGeneration();

  const handleGenerateLogo = () => {
    generateLogo(themeTags, colorTags);
  };

  const handleStartOver = () => {
    resetLogo();
    setThemeTags([]);
    setColorTags([]);
  };

  const canProceed = logoType === 'manual' 
    ? teamName.trim() && initials.trim()
    : customizedName.trim();

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-lg font-semibold">Team Design</h2>
      
      <Tabs defaultValue="manual" value={logoType} onValueChange={(v) => onLogoTypeChange(v as 'manual' | 'ai')}>
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
              onChange={(e) => onTeamNameChange(e.target.value)}
              placeholder="e.g., FC Barcelona"
              className="bg-footbai-header border-footbai-hover focus:ring-footbai-accent"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="initials">Team Initials (1-3 letters)</Label>
              <Input
                id="initials"
                value={initials}
                onChange={(e) => onInitialsChange(e.target.value.substring(0, 3).toUpperCase())}
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
                  onChange={(e) => onBackgroundColorChange(e.target.value)}
                  className="w-16 h-10 p-1 cursor-pointer bg-footbai-header border-footbai-hover"
                />
                <Input 
                  value={backgroundColor} 
                  onChange={(e) => onBackgroundColorChange(e.target.value)}
                  className="bg-footbai-header border-footbai-hover focus:ring-footbai-accent"
                />
              </div>
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
                    backgroundColor: DEFAULT_AI_COLOR
                  }} 
                  size="xl"
                  className="!w-48 !h-48"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="theme-tags">Theme Tags (Max 2)</Label>
                  <p className="text-sm text-muted-foreground mt-1">Add up to 2 themes for your logo</p>
                  <TagInput
                    tags={themeTags}
                    onTagsChange={(tags) => setThemeTags(tags.slice(0, 2))}
                    placeholder="lion, shield"
                    maxTags={2}
                    className=" border-footbai-hover focus:ring-footbai-accent"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="color-tags">Color Tags (Max 3)</Label>
                  <p className="text-sm text-muted-foreground mt-1">Add up to 3 colors for your logo</p>
                  <TagInput
                    tags={colorTags}
                    onTagsChange={(tags) => setColorTags(tags.slice(0, 3))}
                    placeholder="blue, red, gold"
                    maxTags={3}
                    className="border-footbai-hover focus:ring-footbai-accent"
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleGenerateLogo}
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
                  onChange={(e) => onCustomizedNameChange(e.target.value)}
                  placeholder="Customize the generated team name"
                  className="bg-footbai-header border-footbai-hover focus:ring-footbai-accent"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  AI suggested: {generatedClubName}
                </p>
              </div>
              
              <div className="flex gap-4 mt-4">
                <Button 
                  onClick={handleStartOver}
                  variant="outline"
                  className="flex-1 border-footbai-header hover:bg-footbai-hover"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Start Over
                </Button>
                <Button 
                  onClick={onNext}
                  disabled={!customizedName.trim()}
                  className="flex-1 bg-footbai-accent hover:bg-footbai-accent/80 text-black font-medium"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {logoType === 'manual' && (
        <Button 
          onClick={onNext}
          disabled={!canProceed}
          className="bg-footbai-accent hover:bg-footbai-accent/80 text-black font-medium w-full mt-4"
        >
          Next
        </Button>
      )}
    </div>
  );
}; 