import { useAuthStore } from "@/store/auth";
import axios from "axios";
import { authService } from "./api/auth.service";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// 请求拦截器
apiClient.interceptors.request.use(
  function (config) {
    const state = useAuthStore.getState();
    const token = state.accessToken;

    // 已显式设置 Authorization（如刷新接口携带 refreshToken）时不覆盖
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  function (error) {
    // Do something with request error
    return Promise.reject(error);
  },
);

// 同一时刻只发起一次刷新，并发的 401 请求共用这个结果
let refreshPromise: Promise<string> | null = null;

function refreshAccessToken(refreshToken: string): Promise<string> {
  refreshPromise ??= authService
    .refreshToken(refreshToken)
    .then((tokens) => {
      useAuthStore.getState().setTokens(tokens);
      return tokens.accessToken;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

// 响应拦截器
apiClient.interceptors.response.use(
  function (response) {
    return response;
  },
  async function (error) {
    const originalRequest = error.config;
    // 刷新与登录接口的 401 是凭证本身无效，不应触发刷新重试
    const isAuthRequest = ["/auth/refresh", "/auth/login"].includes(
      originalRequest?.url,
    );

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthRequest
    ) {
      originalRequest._retry = true;
      const { refreshToken, reset } = useAuthStore.getState();

      if (refreshToken) {
        try {
          const newAccessToken = await refreshAccessToken(refreshToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } catch {
          // refreshToken 失效，清空登录态
          reset();
        }
      }
    }

    return Promise.reject(error);
  },
);
