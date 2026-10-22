export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: "USER" | "ADMIN";
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}
