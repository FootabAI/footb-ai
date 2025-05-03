export type User = {
  id: string;
  name: string;
  email: string;
  teamId?: string;
};

export type UserState = {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  handleLogout: () => Promise<void>;
  deleteTeam: () => Promise<void>;
  handleGithubLogin: () => Promise<void>;
};