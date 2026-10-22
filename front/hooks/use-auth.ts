import { getErrorMessage } from "@/lib/utils";
import { authService } from "@/service/api/auth.service";
import { useAuthStore } from "@/store/auth";
import { AuthResponse, LoginRequest, RegisterRequest } from "@/types/auth.type";
import { useCallback, useState } from "react";
import { useShallow } from "zustand/react/shallow";

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authState = useAuthStore(
    useShallow((state) => ({
      user: state.user,
      isAuthenticated: state.isAuthenticated,
    })),
  );

  // 登录与注册成功后都返回 token 与用户信息，直接写入登录态
  const authenticate = useCallback(
    async (request: () => Promise<AuthResponse>): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await request();
        useAuthStore.getState().setAuth(res);
        return true;
      } catch (e) {
        setError(getErrorMessage(e));
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const login = useCallback(
    (data: LoginRequest) => authenticate(() => authService.login(data)),
    [authenticate],
  );

  const register = useCallback(
    (data: RegisterRequest) => authenticate(() => authService.register(data)),
    [authenticate],
  );

  // 后端接口失败（如 token 已失效）也照常清空本地登录态，cookie 由 store 订阅同步清除
  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      await authService.logout();
    } finally {
      useAuthStore.getState().reset();
      setIsLoading(false);
    }
  }, []);

  return {
    ...authState,
    isLoading,
    setIsLoading,
    error,
    setError,
    login,
    register,
    logout,
  };
};
