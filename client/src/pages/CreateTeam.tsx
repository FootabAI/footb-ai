import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLogoGeneration } from "@/hooks/useLogoGeneration";
import { useOnboardingStore } from "@/stores/useOnboardingStore";

// Steps
import { LogoStep } from "@/components/team-creation/LogoStep";
import { AttributesStep } from "@/components/team-creation/AttributesStep";
import { SummaryStep } from "@/components/team-creation/SummaryStep";
import { PlayersStep } from "@/components/team-creation/PlayersStep";
import { toast } from "@/components/ui/use-toast";

const STEPS = ["logo", "attributes", "players", "summary"] as const;
type Step = typeof STEPS[number];

const CreateTeam = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("logo");
  const {
    teamName,
    setTeamName,
    logoType,
    setLogoType,
    initials,
    setInitials,
    backgroundColor,
    setBackgroundColor,
    formation,
    setFormation,
    customizedName,
    setCustomizedName,
    themeTags,
    setThemeTags,
    colorTags,
    setColorTags,
    attributes,
    tactic,
    setTactic,
    pointsLeft,
    createTeam,
    handleAttributeChange,
    isLoading,
  } = useOnboardingStore();
  const {
    isGeneratingLogo,
    generatedClubName,
    generateLogo,
    resetLogo,
    generatedLogo,
  } = useLogoGeneration();

  const handleCreateTeam = async () => {
    if (logoType === "manual") {
      await createTeam({
        initials,
        backgroundColor,
      });
    } else {
      await createTeam({
        image: generatedLogo,
        theme: "",
        backgroundColor: "#62df6e",
      });
    }
    navigate("/dashboard");
  };

  const getNextStep = (currentStep: Step): Step | null => {
    const currentIndex = STEPS.indexOf(currentStep);
    return currentIndex < STEPS.length - 1 ? STEPS[currentIndex + 1] : null;
  };

  const getPreviousStep = (currentStep: Step): Step | null => {
    const currentIndex = STEPS.indexOf(currentStep);
    return currentIndex > 0 ? STEPS[currentIndex - 1] : null;
  };

  const handleNext = () => {
    const nextStep = getNextStep(step);
    if (nextStep) {
      setStep(nextStep);
    }
  };

  const handleBack = () => {
    const previousStep = getPreviousStep(step);
    if (previousStep) {
      setStep(previousStep);
    }
  };

  const handleGenerateLogo = async () => {
    try {
      await generateLogo(themeTags, colorTags);
      toast({
        title: "Logo Generated",
        description: "Your logo has been generated successfully",
      });
    } catch (error) {
      console.error("Error generating logo:", error);
      toast({
        title: "Error Generating Logo",
        description: "Please try again",
      });
    }
  };

  const handleStartOver = () => {
    resetLogo();
    setThemeTags([]);
    setColorTags([]);
    setCustomizedName("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-footbai-background p-4">
      <Card className="w-full max-w-3xl bg-footbai-container border-footbai-header">
        <CardHeader className="bg-footbai-header">
          <CardTitle className="text-xl text-center text-white">
            Create Your Football Club
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {step === "logo" && (
            <LogoStep
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
              themeTags={themeTags}
              onThemeTagsChange={(tags) => setThemeTags(tags.slice(0, 2))}
              colorTags={colorTags}
              onColorTagsChange={(tags) => setColorTags(tags.slice(0, 3))}
              generatedLogo={generatedLogo}
              generatedClubName={generatedClubName}
            />
          )}

          {step === "attributes" && (
            <AttributesStep
              attributes={attributes}
              onAttributeChange={handleAttributeChange}
              tactic={tactic}
              onTacticChange={setTactic}
              totalPoints={60}
              pointsLeft={pointsLeft}
            />
          )}
          {step === "players" && (
            <PlayersStep
              onNext={handleNext}
              onPlayersChange={() => {}}
            />
          )}
          {step === "summary" && (
            <SummaryStep
              teamName={logoType === "manual" ? teamName : customizedName}
              initials={initials}
              backgroundColor={backgroundColor}
              attributes={attributes}
              players={[]}
              tactic={tactic}
              logoType={logoType}
              generatedLogo={generatedLogo}
            />
          )}

          <div className="flex justify-between mt-6">
            {step === "logo" ? (
              logoType === "manual" ? (
                <Button
                  onClick={handleNext}
                  disabled={!teamName.trim() || !initials.trim()}
                  className="bg-footbai-accent hover:bg-footbai-accent/80 text-black w-full"
                >
                  Next
                </Button>
              ) : (
                <div className="flex gap-4 w-full">
                  {!generatedLogo ? (
                    <Button
                      onClick={handleGenerateLogo}
                      disabled={isGeneratingLogo || themeTags.length === 0}
                      className="bg-footbai-accent hover:bg-footbai-accent/80 text-black w-full"
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
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={handleStartOver}
                        className="flex-1 border-footbai-header hover:bg-footbai-hover"
                      >
                        Start Over
                      </Button>
                      <Button
                        onClick={handleNext}
                        disabled={!customizedName.trim()}
                        className="flex-1 bg-footbai-accent hover:bg-footbai-accent/80 text-black"
                      >
                        Next
                      </Button>
                    </>
                  )}
                </div>
              )
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="bg-footbai-container hover:bg-footbai-hover border-footbai-header"
                >
                  Back
                </Button>
                <Button
                  onClick={step === "summary" ? handleCreateTeam : handleNext}
                  disabled={step === "summary" && isLoading}
                  className="bg-footbai-accent hover:bg-footbai-accent/80 text-black"
                >
                  {step === "summary" ? (
                    isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Team...
                      </>
                    ) : (
                      "Start your journey"
                    )
                  ) : (
                    "Next"
                  )}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateTeam;
