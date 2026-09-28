/**
 * Auth API Service
 *
 * Real API implementation for authentication endpoints.
 */

import { apiClient } from "./client";
import { AuthUser, LoginResponse, MessageResponse } from "@/types";
import { RegisterData, RegisterResponse, ChangePasswordData } from "@/types/auth";

export const authApi = {
  async login({ username, password }: { username: string; password: string }): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>("/auth/login", {
      username,
      password,
    });
  },

  async logout(): Promise<MessageResponse> {
    return apiClient.post<MessageResponse>("/auth/logout");
  },

  async logoutAll(): Promise<MessageResponse> {
    return apiClient.post<MessageResponse>("/auth/logout-all");
  },

  async me(): Promise<{ data: AuthUser }> {
    return apiClient.get<{ data: AuthUser }>("/auth/me");
  },

  async refresh(): Promise<{ token_type: string }> {
    return apiClient.post<{ token_type: string }>("/auth/refresh");
  },

  async register(data: RegisterData): Promise<RegisterResponse> {
    return apiClient.post<RegisterResponse>("/auth/register", data);
  },

  async changePassword(data: ChangePasswordData): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>("/auth/change-password", data);
  },

};
