import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  balance: number;
  currency: string;
  login: (payload: { token: string; user: User; balance: number; currency: string }) => void;
  logout: () => void;
  setBalance: (amount: number) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      balance: 0,
      currency: 'EUR',

      login: (payload) =>
        set({
          token: payload.token,
          user: payload.user,
          balance: payload.balance,
          currency: payload.currency,
        }),

      logout: () =>
        set({
          token: null,
          user: null,
          balance: 0,
          currency: 'EUR',
        }),

      setBalance: (amount) => set({ balance: amount }),
    }),
    {
      name: 'dgw-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        balance: state.balance,
        currency: state.currency,
      }),
    },
  ),
);
