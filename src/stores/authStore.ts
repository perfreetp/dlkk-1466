import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { DEMO_USERS } from '@/data/mockData';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  users: User[];
}

interface AuthActions {
  login: (employeeId: string, password: string) => boolean;
  logout: () => void;
  getCurrentUser: () => User | null;
  initUsers: () => void;
}

type AuthStore = AuthState & AuthActions;

const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      users: [],

      initUsers: () => {
        const { users } = get();
        if (users.length === 0) {
          set({ users: DEMO_USERS });
        }
      },

      login: (employeeId: string, _password: string) => {
        const { users } = get();
        const matchedUser = users.find((u) => u.employeeId === employeeId);
        if (matchedUser) {
          set({ user: matchedUser, isAuthenticated: true });
          return true;
        }
        set({ user: null, isAuthenticated: false });
        return false;
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },

      getCurrentUser: () => {
        return get().user;
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            state.initUsers();
          }
        };
      },
    },
  ),
);

export default useAuthStore;
