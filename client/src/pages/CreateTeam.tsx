import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Player, useGame } from "@/contexts/GameContext";
import { Team, TeamAttributes, TeamTactic } from "@/contexts/GameContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";
import { Formation } from "@/contexts/GameContext";

// Steps
import { LogoStep } from "@/components/team-creation/LogoStep";
import { AttributesStep } from "@/components/team-creation/AttributesStep";
import { SummaryStep } from "@/components/team-creation/SummaryStep";
import { PlayersStep } from "@/components/team-creation/PlayersStep";
import { Button } from "@/components/ui/button";
import { useLogoGeneration } from "@/hooks/useLogoGeneration";

const STEPS = ["logo", "attributes", "players", "summary"] as const;
type Step = typeof STEPS[number];

const CreateTeam = () => {
  const navigate = useNavigate();
  const { createTeam } = useGame();
  const [step, setStep] = useState<Step>("logo");
  const [teamName, setTeamName] = useState("");
  const [logoType, setLogoType] = useState<"manual" | "ai">("manual");
  const [initials, setInitials] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [backgroundColor, setBackgroundColor] = useState("#62df6e");
  const [formation, setFormation] = useState<Formation>("4-3-3");
  const [customizedName, setCustomizedName] = useState("");
  const [themeTags, setThemeTags] = useState<string[]>([]);
  const [colorTags, setColorTags] = useState<string[]>([]);
  const { isGeneratingLogo, generatedClubName, generateLogo, resetLogo, generatedLogo } = useLogoGeneration();

  const [attributes, setAttributes] = useState<TeamAttributes>({
    passing: 40,
    shooting: 40,
    pace: 40,
    dribbling: 40,
    defending: 40,
    physicality: 40,
  });

  const [tactic, setTactic] = useState<TeamTactic>("Balanced");
  const TOTAL_POINTS = 60;
  const [pointsLeft, setPointsLeft] = useState(TOTAL_POINTS);

  useEffect(() => {
    const totalPointsUsed = Object.values(attributes).reduce(
      (sum, value) => sum + value - 40,
      0
    );
    setPointsLeft(TOTAL_POINTS - totalPointsUsed);
  }, [attributes]);

  const handleAttributeChange = (
    attr: keyof typeof attributes,
    newValue: number
  ) => {
    const oldValue = attributes[attr];
    const pointDiff = newValue - oldValue;

    if (pointsLeft - pointDiff < 0) return;

    setAttributes({ ...attributes, [attr]: newValue });
    setPointsLeft((prev) => prev - pointDiff);
  };

  const handleCreateTeam = () => {
    const finalName = logoType === "manual" ? teamName : customizedName;

    if (logoType === "manual") {
      createTeam({
        name: finalName,
        logo: {
          initials:
            logoType === "manual"
              ? initials
              : customizedName.substring(0, 2).toUpperCase(),
          backgroundColor: logoType === "manual" ? backgroundColor : "#62df6e",
        },
        attributes,
        tactic,
        formation,
        players,
        userId: "",
      });
    } else {
      createTeam({
        name: finalName,
        logo: {
          image: generatedLogo,
          theme: "",
          backgroundColor: "#62df6e",
        },
        attributes,
        tactic,
        formation,
        players,
        userId: "",
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

  const handleGenerateLogo = () => {
    generateLogo(themeTags, colorTags);
  };

  const handleStartOver = () => {
    resetLogo();
    setThemeTags([]);
    setColorTags([]);
    setCustomizedName("");
  };

  useEffect(() => {
    if (teamName && logoType === "manual") {
      const words = teamName.split(" ");
      if (words.length === 1) {
        setInitials(words[0].substring(0, 3).toUpperCase());
      } else {
        setInitials(
          words
            .map((word) => word[0])
            .join("")
            .substring(0, 3)
            .toUpperCase()
        );
      }
    }
  }, [teamName, logoType]);

  // Set customized name to generated club name when available
  useEffect(() => {
    if (generatedClubName && !customizedName) {
      setCustomizedName(generatedClubName);
    }
  }, [generatedClubName]);

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
              totalPoints={TOTAL_POINTS}
              pointsLeft={pointsLeft}
            />
          )}
          {step === "players" && (
            <PlayersStep 
              onNext={handleNext}
              onFormationChange={setFormation}
              onPlayersChange={setPlayers}
            />
          )}
          {step === "summary" && (
            <SummaryStep
              teamName={logoType === "manual" ? teamName : customizedName}
              initials={initials}
              backgroundColor={backgroundColor}
              attributes={attributes}
              players={players}
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
                  className="bg-footbai-accent hover:bg-footbai-accent/80 text-black"
                >
                  {step === "summary" ? "Start your journey" : "Next"}
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
