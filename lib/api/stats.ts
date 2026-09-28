import { apiClient } from "./client";

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  totalApplications: number;
  activeApplications: number;
  recentLogins: number;
}

export const statsApi = {
  async getDashboardStats(): Promise<DashboardStats> {
    return apiClient.get<DashboardStats>("/stats/dashboard");
  },
};
