import { create } from "zustand";
import { db, auth, storage } from "@/firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Team, Player} from "@/types";
import { useTeamStore } from "./useTeamStore";
import { DEFAULT_ATTRIBUTES, TOTAL_POINTS, DEFAULT_TEAM_STATS } from "@/config/default_attributes";
import { OnboardingState } from "@/types/onboarding";
import { streamPlayerNames, streamPlayerImage } from "@/api";


export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  // Initial state
  teamName: "",
  logoType: "manual",
  initials: "",
  backgroundColor: "#62df6e",
  formation: "4-3-3",
  customizedName: "",
  themeTags: [],
  colorTags: [],
  attributes: DEFAULT_ATTRIBUTES,
  tactic: "tiki-taka",
  pointsLeft: TOTAL_POINTS,
  isLoading: false,
  error: null,
  success: null,
  teamId: "",
  mainColor: "#62df6e",
  teamStats: DEFAULT_TEAM_STATS,
  nationality: "",
  players: [],
  imageGenerationProgress: 0,
  isGeneratingImages: false,
  currentStep: 1,
  // Actions
  setTeamName: (name) => set({ teamName: name }),
  setLogoType: (type) => set({ logoType: type }),
  setInitials: (initials) => set({ initials }),
  setBackgroundColor: (color) => {
    set({
      backgroundColor: color,
      mainColor: color, // Also update mainColor when background color changes
    });
  },
  setFormation: (formation) => set({ formation }),
  setCustomizedName: (name) => set({ customizedName: name }),
  setThemeTags: (tags) => set({ themeTags: tags }),
  setColorTags: (tags) => set({ colorTags: tags }),
  setTeamId: (id) => set({ teamId: id }),
  setTactic: (tactic) => set({ tactic }),
  setMainColor: (color) => {
    set({
      mainColor: color,
      backgroundColor: color, // Also update backgroundColor when main color changes
    });
  },
  setNationality: (nationality) => set({ nationality }),
  setPlayers: (players) => set({ players }),
  setCurrentStep: (step) => set({ currentStep: step }),
  setAttributes: (attributes) => set({ attributes }),
  setTeamStats: (stats) => set({ teamStats: stats }),
  generatePlayers: async (nationality: string, generateImages: boolean) => {
    set({ isLoading: true, error: null });
    
    try {
      // Generate a new teamId if one doesn't exist
      const teamId = get().teamId || `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      if (!get().teamId) {
        set({ teamId });
      }

      // Create 11 placeholder players immediately
      const placeholderPlayers = Array.from({ length: 11 }, (_, index) => ({
        id: `player-${teamId}-${index}`,
        name: "Generating...",
        position: getDefaultPosition(index),
        rating: 0,
        teamId,
        image_base64: null,
        imageUrl: null,
        createdAt: new Date().toISOString(),
      }));

      // Set placeholders immediately
      set({ players: placeholderPlayers, isLoading: false });

      // Generate player names with streaming
      const nameStream = await streamPlayerNames(nationality, true);
      let playerIndex = 0;

      // Update names and ratings as they come in
      for await (const data of nameStream) {
        if (data?.success && data?.player) {
          set(state => {
            const updatedPlayers = [...state.players];
            if (updatedPlayers[playerIndex]) {
              updatedPlayers[playerIndex] = {
                ...updatedPlayers[playerIndex],
                name: data.player.name,
                position: data.player.position || getDefaultPosition(playerIndex),
                rating: Math.floor(Math.random() * 30) + 60,
              };
            }
            playerIndex++;
            return { players: updatedPlayers };
          });
        }
      }

      // If images were requested, generate them
      if (generateImages) {
        set({ isGeneratingImages: true });
        let completedPlayers = 0;

        // Process players sequentially with streaming
        for (const player of get().players) {
          try {
            const imageStream = await streamPlayerImage({
              name: player.name,
              position: player.position
            });

            for await (const imageData of imageStream) {
              if (imageData?.success && imageData?.player) {
                const result = imageData.player;
                if (result.error || !result.image_base64) {
                  console.error('Invalid image data for player:', player.name);
                  continue;
                }

                try {
                  // Convert base64 to blob and upload to Firebase Storage
                  const base64Data = result.image_base64.replace(/^data:image\/\w+;base64,/, '');
                  const binaryString = atob(base64Data);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }
                  const blob = new Blob([bytes], { type: 'image/png' });
                  
                  // Upload to Firebase Storage
                  const imageRef = ref(storage, `players/${teamId}/${player.id}.png`);
                  await uploadBytes(imageRef, blob);
                  const imageUrl = await getDownloadURL(imageRef);

                  // Update player with image URL
                  set(state => {
                    const updatedPlayers = state.players.map(p => 
                      p.id === player.id 
                        ? { ...p, imageUrl, image_base64: null }
                        : p
                    );
                    completedPlayers++;
                    return { 
                      players: updatedPlayers,
                      imageGenerationProgress: (completedPlayers / state.players.length) * 100
                    };
                  });
                } catch (uploadError) {
                  console.error(`Error uploading image for player ${player.name}:`, uploadError);
                }
              }
            }
          } catch (error) {
            console.error(`Error processing player ${player.name}:`, error);
          }
        }
      }

      set({ isGeneratingImages: false });
      return { success: true, players: get().players };

    } catch (error) {
      console.error('Error generating players:', error);
      set({ isLoading: false, isGeneratingImages: false });
      return { 
        success: false, 
        players: [], 
        error: error instanceof Error ? error.message : 'Failed to generate players' 
      };
    }
  },
  handleAttributeChange: (attr, newValue) => {
    const { attributes, pointsLeft } = get();
    const oldValue = attributes[attr];
    const pointDifference = newValue - oldValue;

    if (pointsLeft - pointDifference < 0) {
      return;
    }

    set({
      attributes: {
        ...attributes,
        [attr]: newValue,
      },
      pointsLeft: pointsLeft - pointDifference,
    });
  },

  createTeam: async (logoData, teamStats, attributes, tactic, formation) => {
    set({ isLoading: true, error: null, success: null });
    try {
      const {
        teamName,
        logoType,
        initials,
        backgroundColor,
        customizedName,
        pointsLeft,
        mainColor,
        players,
        teamId,
        nationality,
      } = get();

      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");

      const teamStore = useTeamStore.getState();
      if (!teamId) throw new Error("Team ID not found");

      let logoUrl = "";
      if (logoType === "ai" && logoData.image) {
        const storageRef = ref(storage, `logos/${teamId}`);
        const response = await fetch(logoData.image);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        logoUrl = await getDownloadURL(storageRef);
      }

      const finalName = logoType === "manual" ? teamName : customizedName;

      const updatedTeam: Team & { userId: string } = {
        id: teamId,
        name: finalName,
        logo: {
          type: logoType,
          data:
            logoType === "manual"
              ? {
                  initials: logoData.initials!,
                  backgroundColor: mainColor,
                  mainColor: mainColor,
                }
              : {
                  image: logoUrl,
                  mainColor: mainColor,
                  backgroundColor: mainColor,
                },
        },
        attributes,
        tactic,
        formation,
        teamStats: teamStats || DEFAULT_TEAM_STATS,
        points: pointsLeft,
        players,
        userId: user.uid,
        isBot: false,
      };

      await updateDoc(doc(db, "teams", teamId), updatedTeam);
      teamStore.setTeam(updatedTeam);
      set({ success: "Team created successfully!" });
    } catch (err) {
      console.error("Error creating team:", err);
      set({ error: "Failed to create team. Please try again." });
    } finally {
      set({ isLoading: false });
    }
  },

  resetTeamCreation: () => {
    set({
      teamName: "",
      logoType: "manual",
      initials: "",
      backgroundColor: "#62df6e",
      mainColor: "#62df6e", // Reset mainColor as well
      formation: "4-3-3",
      customizedName: "",
      themeTags: [],
      colorTags: [],
      attributes: DEFAULT_ATTRIBUTES,
      tactic: "tiki-taka",
      pointsLeft: TOTAL_POINTS,
      teamStats: DEFAULT_TEAM_STATS,
      nationality: "",
      players: [],
      imageGenerationProgress: 0,
      isGeneratingImages: false,
    });
  },
}));

// Helper function to create placeholder players
const createPlaceholderPlayers = (teamId: string): Player[] => {
  const positions = [
    "Goalkeeper",
    "Right-Back",
    "Centre-Back",
    "Centre-Back",
    "Left-Back",
    "Central Midfielder",
    "Central Midfielder",
    "Attacking Midfielder",
    "Right Winger",
    "Left Winger",
    "Striker"
  ];

  return positions.map((position, index) => ({
    id: `player-${teamId}-${index}`,
    name: "Loading...",
    position,
    rating: 0,
    teamId,
    image_base64: null,
    imageUrl: null,
    createdAt: new Date().toISOString(),
  }));
};

// Helper function to get default positions based on player index
function getDefaultPosition(index: number): string {
  const positions = [
    "Goalkeeper",
    "Right-Back",
    "Centre-Back",
    "Centre-Back",
    "Left-Back",
    "Central Midfielder",
    "Central Midfielder",
    "Attacking Midfielder",
    "Right Winger",
    "Left Winger",
    "Striker"
  ];
  return positions[index] || "Substitute";
}
