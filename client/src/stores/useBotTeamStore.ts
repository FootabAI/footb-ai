import { create } from 'zustand';
import { Team } from '@/types';
import { db } from '@/firebaseConfig';
import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { DEFAULT_TEAM_STATS } from '@/config/default_attributes';

type BotTeamState = {
  botTeams: Team[];
  isLoading: boolean;
  error: string | null;
  fetchBotTeams: () => Promise<void>;
};

const botTeamsData: Omit<Team, 'id'>[] = [
  {
    name: 'AI United',
    logo: {
      type: 'manual',
      data: {
        initials: 'AI',
        backgroundColor: '#ff4d4d',
        mainColor: '#ff4d4d'
      }
    },
    attributes: {
      passing: 30,
      shooting: 55,
      pace: 26,
      dribbling: 30,
      defending: 30,
      physicality: 30,
    },
    tactic: 'Tiki-Taka',
    points: 0,
    isBot: true,
    players: [],
    teamStats: DEFAULT_TEAM_STATS,
    userId: 'system',
    formation: '4-3-3',
  },
  {
    name: 'Tech Titans',
    logo: {
      type: 'manual',
      data: {
        initials: 'TT',
        backgroundColor: '#4d79ff',
        mainColor: '#4d79ff'
      }
    },
    attributes: {
      passing: 55,
      shooting: 49,
      pace: 55,
      dribbling: 52,
      defending: 48,
      physicality: 25,
    },
    tactic: 'Park-The-Bus',
    points: 0,
    isBot: true,
    players: [],
    teamStats: DEFAULT_TEAM_STATS,
    userId: 'system',
    formation: '4-2-3-1',
  },
  {
    name: 'Digital Dragons',
    logo: {
      type: 'manual',
      data: {
        initials: 'DD',
        backgroundColor: '#4dff4d',
        mainColor: '#4dff4d'
      }
    },
    attributes: {
      passing: 34,
      shooting: 55,
      pace: 47,
      dribbling: 20,
      defending: 65,
      physicality: 30,
    },
    tactic: 'Gegenpressing',
    points: 0,
    isBot: true,
    players: [],
    teamStats: DEFAULT_TEAM_STATS,
    userId: 'system',
    formation: '4-4-2',
  }
];

export const useBotTeamStore = create<BotTeamState>((set, get) => ({
  botTeams: [],
  isLoading: false,
  error: null,

  fetchBotTeams: async () => {
    set({ isLoading: true, error: null });
    try {
      const teamsCollection = collection(db, 'teams');
      const q = query(teamsCollection, where('isBot', '==', true));
      const querySnapshot = await getDocs(q);
      
      // If no bot teams exist, create them
      if (querySnapshot.empty) {
        console.log('Initializing bot teams...');
        for (const teamData of botTeamsData) {
          const docRef = doc(teamsCollection);
          await setDoc(docRef, {
            ...teamData,
            id: docRef.id
          });
        }
        // Fetch the newly created teams
        const newQuerySnapshot = await getDocs(q);
        const botTeams = newQuerySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as Team[];
        set({ botTeams, isLoading: false });
        return;
      }

      // If bot teams exist, just fetch them
      const botTeams = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Team[];

      set({ botTeams, isLoading: false });
    } catch (error) {
      console.error('Error fetching bot teams:', error);
      set({ error: 'Failed to fetch bot teams', isLoading: false });
    }
  }
})); 