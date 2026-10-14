import { apiClient } from "../axios.config";

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  logout: async (): Promise<void> => {
    try {
      await apiClient.post("/auth/logout");
    } catch (error) {
      console.error("Logout failed", error);
    }
  },

  // 后端从 Authorization 头读取 refreshToken，并返回新的一对 token（refreshToken 会轮换）
  refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    const { data } = await apiClient.post<RefreshTokenResponse>(
      "/auth/refresh",
      null,
      { headers: { Authorization: `Bearer ${refreshToken}` } },
    );
    return data;
  },
};
