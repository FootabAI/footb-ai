import { create } from "zustand";
import { db, auth, storage } from "@/firebaseConfig";
import { addDoc, collection } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Team, Player} from "@/types";
import { useTeamStore } from "./useTeamStore";
import { DEFAULT_ATTRIBUTES, TOTAL_POINTS, DEFAULT_TEAM_STATS } from "@/config/default_attributes";
import { OnboardingState } from "@/types/onboarding";


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
  tactic: "Balanced",
  pointsLeft: TOTAL_POINTS,
  isLoading: false,
  error: null,
  success: null,
  teamId: "",
  mainColor: "#62df6e",
  teamStats: DEFAULT_TEAM_STATS,
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
  generateRandomPlayers: (teamId: string, teamName: string) =>
    generateRandomPlayers(teamId, teamName),
  setTactic: (tactic) => set({ tactic }),
  setMainColor: (color) => {
    set({
      mainColor: color,
      backgroundColor: color, // Also update backgroundColor when main color changes
    });
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

  createTeam: async (logoData) => {
    set({ isLoading: true, error: null, success: null });
    try {
      const {
        teamName,
        logoType,
        initials,
        backgroundColor,
        formation,
        customizedName,
        attributes,
        tactic,
        pointsLeft,
        mainColor,
        teamStats,
      } = get();

      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");

      const teamStore = useTeamStore.getState();
      const teamId = `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      let logoUrl = "";
      if (logoType === "ai" && logoData.image) {
        const storageRef = ref(storage, `logos/${teamId}`);
        const response = await fetch(logoData.image);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        logoUrl = await getDownloadURL(storageRef);
      }

      const finalName = logoType === "manual" ? teamName : customizedName;

      const newTeam: Team & { userId: string } = {
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
        players: [],
        userId: user.uid,
        isBot: false,
      };

      const newPlayers = generateRandomPlayers(teamId, finalName);
      newTeam.players = newPlayers;

      // Store team in Firestore
      const teamsCollection = collection(db, "teams");
      const docRef = await addDoc(teamsCollection, newTeam);
      newTeam.id = docRef.id;

      // Update TeamStore with the new team
      teamStore.setTeam(newTeam);
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
      tactic: "Balanced",
      pointsLeft: TOTAL_POINTS,
      teamStats: DEFAULT_TEAM_STATS,
    });
  },
}));

// Helper function to generate random players
const generateRandomPlayers = (teamId: string, teamName: string): Player[] => {
  const positions = [
    "GK",
    "DEF",
    "DEF",
    "DEF",
    "DEF",
    "MID",
    "MID",
    "MID",
    "ATT",
    "ATT",
    "ATT",
  ];
  const firstNames = [
    "Alex",
    "Sam",
    "Jordan",
    "Taylor",
    "Casey",
    "Morgan",
    "Riley",
    "Jamie",
    "Avery",
    "Cameron",
    "Quinn",
  ];
  const lastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
    "Miller",
    "Davis",
    "Rodriguez",
    "Martinez",
    "Wilson",
  ];

  return positions.map((pos, i) => ({
    id: `player-${teamId}-${i}`,
    name: `${firstNames[i]} ${lastNames[i]}`,
    position: pos,
    rating: Math.floor(Math.random() * 30) + 60, // Random rating between 60-90
    teamId,
  }));
};
