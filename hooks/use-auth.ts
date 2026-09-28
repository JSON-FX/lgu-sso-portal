"use client";

import { create } from "zustand";
import { AuthUser, RegisterData, RegisterResponse } from "@/types";
import { api, ApiError } from "@/lib/api";

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  mustChangePassword: boolean;
  setupCompleted: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: (everywhere?: boolean) => Promise<void>;
  authError: string | null;
  checkAuth: () => Promise<void>;
  register: (data: RegisterData) => Promise<RegisterResponse>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

function checkIsSuperAdmin(user: AuthUser): boolean {
  return user.applications?.some((app) => app.name === "Admin App Management System" && app.role === "super_administrator") ?? false;
}

export const useAuth = create<AuthState>()(
    (set) => ({
      user: null,
      authError: null,
      isLoading: true,
      isAuthenticated: false,
      isSuperAdmin: false,
      mustChangePassword: false,
      setupCompleted: false,

      login: async (username: string, password: string) => {
        await api.auth.login({ username, password });

        // Fetch full user data including applications from /auth/me
        const meResponse = await api.auth.me();
        const user = meResponse.data as AuthUser;
        const isSuperAdmin = checkIsSuperAdmin(user);

        set({
          user,
          authError: null,
          isAuthenticated: true,
          isSuperAdmin,
          mustChangePassword: user.must_change_password,
          setupCompleted: false,
          isLoading: false,
        });
      },

      logout: async (everywhere = false) => {
        try {
          if (everywhere) await api.auth.logoutAll();
          else await api.auth.logout();
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 401) throw error;
        }
        set({ user: null, isAuthenticated: false, isSuperAdmin: false, mustChangePassword: false, setupCompleted: false, isLoading: false, authError: null });
      },

      checkAuth: async () => {
        // Remove bearer tokens stored by earlier portal releases.
        localStorage.removeItem("lgu-sso-auth");
        document.cookie = "auth_token=; Max-Age=0; path=/; SameSite=Lax";
        try {
          const response = await api.auth.me();
          const user = response.data;

          set({
            user,
            authError: null,
            isAuthenticated: true,
            isSuperAdmin: checkIsSuperAdmin(user),
            mustChangePassword: user.must_change_password,
            setupCompleted: false,
            isLoading: false,
          });
        } catch (error) {
          set({
            user: null, isLoading: false, isAuthenticated: false,
            isSuperAdmin: false, mustChangePassword: false, setupCompleted: false,
            authError: error instanceof ApiError && error.status === 401 ? null : "Sign-in service is temporarily unavailable. Please try again.",
          });
        }
      },

      register: async (data: RegisterData): Promise<RegisterResponse> => {
        return api.auth.register(data);
      },

      changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
        await api.auth.changePassword({ current_password: currentPassword, new_password: newPassword });
        set((state) => ({ mustChangePassword: false, setupCompleted: state.mustChangePassword }));
      },
    })
);
