import { apiClient } from "./client"
import type { Employee, Office, Position } from "@/types/employee"
import type { EmployeeApplication } from "@/types/employee"
import type { UpdatePortalProfileData } from "@/types/portal"

export const portalApi = {
  getProfile: async (): Promise<Employee> => {
    const response = await apiClient.get<{ data: Employee }>("/portal/profile")
    return response.data
  },

  updateProfile: async (data: UpdatePortalProfileData): Promise<Employee> => {
    const response = await apiClient.put<{ data: Employee }>("/portal/profile", data)
    return response.data
  },

  getApplications: async (): Promise<EmployeeApplication[]> => {
    const response = await apiClient.get<{ data: EmployeeApplication[] }>("/portal/applications")
    return response.data
  },

  getOffices: async (): Promise<Office[]> => {
    const response = await apiClient.get<{ data: Office[] }>("/portal/offices")
    return response.data
  },

  getPositions: async (): Promise<Position[]> => {
    const response = await apiClient.get<{ data: Position[] }>("/portal/positions")
    return response.data
  },
}
