import { apiClient, ApiError } from "./client"

export const ssoApi = {
  validateRedirect: async (data: { client_id: string; redirect_uri: string }): Promise<{ valid: boolean; application_name: string }> => {
    return apiClient.post("/sso/validate-redirect", data)
  },

  sessionCheck: async (): Promise<{ authenticated: boolean; must_change_password?: boolean }> => {
    try {
      const result = await apiClient.get<{ data: { must_change_password: boolean } }>("/auth/me");
      return { authenticated: true, must_change_password: result.data.must_change_password };
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return { authenticated: false };
      throw error;
    }
  },

  issueCode: async (data: { client_id: string; redirect_uri: string }): Promise<{ code: string; expires_in: number }> => {
    return apiClient.post("/sso/code", data);
  },
}
