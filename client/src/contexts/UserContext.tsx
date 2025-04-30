import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { app } from '../firebaseConfig';
import { doc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

type User = {
  id: string;
  name: string;
  email: string;
  teamId?: string;
};

type UserContextType = {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  setUser: (user: User | null) => void;
  handleLogout: () => Promise<void>;
  deleteTeam: () => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Anonymous',
          email: firebaseUser.email || '',
        });
        setIsLoggedIn(true);
      } else {
        setUser(null);
        setIsLoggedIn(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsLoggedIn(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const deleteTeam = async () => {
    try {
      if (!user) throw new Error('User not authenticated');

      // Find the user's team
      const teamsCollection = collection(db, 'teams');
      const q = query(teamsCollection, where('userId', '==', user.id));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('No team found for user');
      }

      // Delete the team document
      const teamDoc = querySnapshot.docs[0];
      await deleteDoc(teamDoc.ref);

      // Logout the user after team deletion
      await handleLogout();
    } catch (error) {
      console.error('Error deleting team:', error);
      throw error;
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        isLoggedIn,
        isLoading,
        setIsLoggedIn,
        setUser,
        handleLogout,
        deleteTeam,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}; 