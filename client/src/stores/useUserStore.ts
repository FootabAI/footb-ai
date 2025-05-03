import { create } from 'zustand';
import { getAuth, onAuthStateChanged, signOut, User as FirebaseUser, createUserWithEmailAndPassword, updateProfile, signInWithPopup, GithubAuthProvider, signInWithEmailAndPassword } from 'firebase/auth';
import { app } from '../firebaseConfig';
import { deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { UserState } from '../types/user';
import { useTeamStore } from './useTeamStore';

export const useUserStore = create<UserState>((set) => {
  const auth = getAuth(app);
  const githubProvider = new GithubAuthProvider();

  // Set up auth state listener
  onAuthStateChanged(auth, (user: FirebaseUser | null) => {
    if (user) {
      set({
        user: {
          id: user.uid,
          name: user.displayName || 'Anonymous',
          email: user.email || '',
        },
        isLoggedIn: true,
        isLoading: false,
      });
    } else {
      set({ user: null, isLoggedIn: false, isLoading: false });
    }
  });

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      set({
        user: {
          id: userCredential.user.uid,
          name,
          email,
        },
        isLoggedIn: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  };

  const handleGithubLogin = async () => {
    try {
      await signInWithPopup(auth, githubProvider);
    } catch (error) {
      console.error('Error signing in with GitHub:', error);
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      set({ user: null, isLoggedIn: false });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const deleteTeam = async () => {
    try {
      const state = useUserStore.getState();
      if (!state.user) throw new Error('User not authenticated');

      const teamsCollection = collection(db, 'teams');
      const q = query(teamsCollection, where('userId', '==', state.user.id));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('No team found for user');
      }
      const teamDoc = querySnapshot.docs[0];
      await deleteDoc(teamDoc.ref);

      set({ user: { ...state.user, teamId: undefined } });
      useTeamStore.getState().clearTeam();
    } catch (error) {
      console.error('Error deleting team:', error);
      throw error;
    }
  };

  return {
    user: null,
    isLoggedIn: false,
    isLoading: true,
    setUser: (user) => set({ user }),
    setIsLoggedIn: (isLoggedIn) => set({ isLoggedIn }),
    login,
    register,
    handleGithubLogin,
    handleLogout,
    deleteTeam,
  };
}); 