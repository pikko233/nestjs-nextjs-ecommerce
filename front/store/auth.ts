import { User } from "@/types/auth.type";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
};

type AuthStateType = typeof initialState & {
  reset: () => void;
  setAccessToken: (accessToken: string) => void;
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
};

export const useAuthStore = create<AuthStateType>()(
  persist(
    (set) => ({
      ...initialState,
      reset: () => set(initialState),
      setAccessToken: (accessToken) => set({ accessToken }),
      setTokens: ({ accessToken, refreshToken }) =>
        set({ accessToken, refreshToken }),
    }),
    { name: "auth-store" },
  ),
);
