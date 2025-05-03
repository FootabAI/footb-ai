import { create } from 'zustand';
import { Team, TeamAttributes, TeamTactic, Formation } from '@/types';
import { db, auth } from '@/firebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

type TeamState = {
  team: Team | null;
  selectedFormation: Formation;
  isLoading: boolean;
  error: string | null;

  // Actions
  setTeam: (team: Team | null) => void;
  updateTeam: (team: Team) => Promise<void>;
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
  selectedFormation: '4-3-3' as Formation,
  isLoading: true,
  error: null,

  // Actions
  setTeam: (team) => set({ team }),
  
  updateTeam: async (team) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const teamsCollection = collection(db, 'teams');
      const q = query(teamsCollection, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('No team found for user');
      }

      const teamDoc = querySnapshot.docs[0];
      await updateDoc(teamDoc.ref, team);
    } catch (error) {
      console.error('Error updating team:', error);
      throw error;
    }
  },

  updateTeamAttributes: (attributes) => {
    set((state) => ({
      team: state.team ? { ...state.team, attributes } : null
    }));
    const state = useTeamStore.getState();
    if (state.team) {
      state.updateTeam({ ...state.team, attributes }).catch(console.error);
    }
  },
  
  updateTeamTactic: (tactic) => {
    set((state) => ({
      team: state.team ? { ...state.team, tactic } : null
    }));
    const state = useTeamStore.getState();
    if (state.team) {
      state.updateTeam({ ...state.team, tactic }).catch(console.error);
    }
  },
  
  updateTeamFormation: (formation) => {
    set((state) => ({
      team: state.team ? { ...state.team, formation } : null,
      selectedFormation: formation
    }));
    const state = useTeamStore.getState();
    if (state.team) {
      state.updateTeam({ ...state.team, formation }).catch(console.error);
    }
  },
  
  resetTeam: () => set({ team: null, selectedFormation: '4-3-3' as Formation }),
  clearTeam: () => set({ team: null, isLoading: false }),
  
  fetchTeam: async () => {
    const user = auth.currentUser;
    if (!user) {
      set({ team: null, isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const teamsCollection = collection(db, 'teams');
      const q = query(teamsCollection, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        set({ team: null, isLoading: false });
        return;
      }

      const teamDoc = querySnapshot.docs[0];
      const teamData = teamDoc.data() as Team;
      set({ 
        team: teamData, 
        selectedFormation: teamData.formation as Formation || '4-3-3' as Formation,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error fetching team:', error);
      set({ error: 'Failed to fetch team data', isLoading: false });
    }
  },
}));

// Set up auth state listener
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await useTeamStore.getState().fetchTeam();
  } else {
    useTeamStore.getState().clearTeam();
  }
});
