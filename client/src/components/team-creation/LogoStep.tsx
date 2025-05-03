import { useEffect } from 'react';
import TeamLogo from '@/components/TeamLogo';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TagInput from '@/components/TagInput';

interface LogoStepProps {
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
  themeTags: string[];
  onThemeTagsChange: (tags: string[]) => void;
  colorTags: string[];
  onColorTagsChange: (tags: string[]) => void;
  generatedLogo?: string;
  generatedClubName?: string;
}


export const LogoStep = ({
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
  themeTags,
  onThemeTagsChange,
  colorTags,
  onColorTagsChange,
  generatedLogo,
  generatedClubName,
}: LogoStepProps) => {
  // Auto-populate initials when team name changes
  useEffect(() => {
    if (teamName && logoType === "manual") {
      const words = teamName.split(" ");
      if (words.length === 1) {
        onInitialsChange(words[0].substring(0, 3).toUpperCase());
      } else {
        onInitialsChange(
          words
            .map((word) => word[0])
            .join("")
            .substring(0, 3)
            .toUpperCase()
        );
      }
    }
  }, [teamName, logoType, onInitialsChange]);

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
                    backgroundColor: "#333"
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
                    onTagsChange={onThemeTagsChange}
                    placeholder="lion, shield"
                    maxTags={2}
                    className="border-footbai-hover focus:ring-footbai-accent"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="color-tags">Color Tags (Max 3)</Label>
                  <p className="text-sm text-muted-foreground mt-1">Add up to 3 colors for your logo</p>
                  <TagInput
                    tags={colorTags}
                    onTagsChange={onColorTagsChange}
                    placeholder="blue, red, gold"
                    maxTags={3}
                    className="border-footbai-hover focus:ring-footbai-accent"
                  />
                </div>
              </div>
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
              <div className="flex flex-wrap gap-2 justify-center">
                { colorTags.map((tag) => (
                  <div key={tag} className="bg-footbai-accent/20 px-2 py-1 rounded-md text-sm">
                    {tag}
                  </div>
                ))}
                { themeTags.map((tag) => (
                  <div key={tag} className="bg-footbai-accent/20 px-2 py-1 rounded-md text-sm">
                    {tag}
                  </div>
                ))}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="team-name">Team Name</Label>
                <Input
                  id="team-name"
                  value={customizedName || generatedClubName}
                  onChange={(e) => onCustomizedNameChange(e.target.value)}
                  placeholder="Customize the generated team name"
                  className="bg-footbai-header border-footbai-hover focus:ring-footbai-accent"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  AI suggested: {generatedClubName}
                </p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}; 