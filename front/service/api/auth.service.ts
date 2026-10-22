import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
} from "@/types/auth.type";
import { apiClient } from "../axios.config";

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>("/auth/login", data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>(
      "/auth/register",
      data,
    );
    return response.data;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post("/auth/logout");
    } catch (error) {
      console.error("退出登录失败", error);
    }
  },

  // 后端从 Authorization 头读取 refreshToken，并返回新的一对 token（refreshToken 会轮换）
  refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    // body 传 {} 而不是 null：Content-Type 为 JSON 时 null 会被序列化为 "null"，后端 body-parser 严格模式会返回 400
    const { data } = await apiClient.post<RefreshTokenResponse>(
      "/auth/refresh",
      {},
      { headers: { Authorization: `Bearer ${refreshToken}` } },
    );
    return data;
  },
};
