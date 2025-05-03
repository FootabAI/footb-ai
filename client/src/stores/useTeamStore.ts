import { create } from 'zustand';
import { Team, TeamAttributes, TeamTactic, Formation } from '@/types';
import { db, auth } from '@/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

type TeamState = {
  team: Team | null;
  selectedFormation: Formation;
  isLoading: boolean;
  error: string | null;

  // Actions
  setTeam: (team: Team | null) => void;
  updateTeam: (team: Team) => void;
  updateTeamAttributes: (attributes: TeamAttributes) => void;
  updateTeamTactic: (tactic: TeamTactic) => void;
  updateTeamFormation: (formation: Formation) => void;
  resetTeam: () => void;
  clearTeam: () => void;
  fetchTeam: () => Promise<void>;
};

export const useTeamStore = create<TeamState>((set) => ({
  // Initial state
  team: null,
  selectedFormation: '4-3-3',
  isLoading: true,
  error: null,

  // Actions
  setTeam: (team) => set({ team }),
  updateTeam: (team) => set({ team }),
  updateTeamAttributes: (attributes) => 
    set((state) => ({
      team: state.team ? { ...state.team, attributes } : null
    })),
  updateTeamTactic: (tactic) => 
    set((state) => ({
      team: state.team ? { ...state.team, tactic } : null
    })),
  updateTeamFormation: (formation) => 
    set((state) => ({
      team: state.team ? { ...state.team, formation } : null,
      selectedFormation: formation
    })),
  resetTeam: () => set({ team: null, selectedFormation: '4-3-3' }),
  clearTeam: () => set({ team: null }),
  fetchTeam: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('No user found in fetchTeam');
        set({ team: null, isLoading: false });
        return;
      }

      console.log('Fetching team for user:', user.uid);
      const teamsCollection = collection(db, 'teams');
      const q = query(teamsCollection, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log('No team found for user');
        set({ team: null, isLoading: false });
        return;
      }

      const teamDoc = querySnapshot.docs[0];
      const teamData = teamDoc.data() as Team;
      console.log('Team found:', teamData);
      set({ team: teamData, isLoading: false });
    } catch (error) {
      console.error('Error fetching team:', error);
      set({ error: 'Failed to fetch team data', isLoading: false });
    }
  },
}));

// Set up auth state listener
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log('Auth state changed, fetching team for user:', user.uid);
    await useTeamStore.getState().fetchTeam();
  } else {
    console.log('User logged out, clearing team');
    useTeamStore.getState().clearTeam();
  }
});
