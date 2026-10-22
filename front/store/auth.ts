import { syncAuthCookie } from "@/lib/auth-cookie";
import { AuthResponse, User } from "@/types/auth.type";
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
  setAuth: (auth: AuthResponse) => void;
  setAccessToken: (accessToken: string) => void;
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
};

export const useAuthStore = create<AuthStateType>()(
  persist(
    (set) => ({
      ...initialState,
      reset: () => set(initialState),
      setAuth: ({ accessToken, refreshToken, user }) =>
        set({ accessToken, refreshToken, user, isAuthenticated: true }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setTokens: ({ accessToken, refreshToken }) =>
        set({ accessToken, refreshToken }),
    }),
    {
      name: "auth-store",
      // 从 localStorage 恢复后补写 cookie，兼容 cookie 过期但本地仍有登录态的情况
      onRehydrateStorage: () => (state) => {
        syncAuthCookie(state?.isAuthenticated ?? false);
      },
    },
  ),
);

// 登录、退出、刷新失败重置时同步 cookie
useAuthStore.subscribe((state, prevState) => {
  if (state.isAuthenticated !== prevState.isAuthenticated) {
    syncAuthCookie(state.isAuthenticated);
  }
});
