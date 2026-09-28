/**
 * Employee API Service
 *
 * Real API implementation for employee management endpoints.
 */

import { apiClient } from "./client";
import {
  Employee,
  CreateEmployeeData,
  UpdateEmployeeData,
  PaginatedResponse,
  SingleResponse,
  MessageResponse,
  Role,
} from "@/types";

export const employeeApi = {
  async list(
    page: number = 1,
    perPage: number = 15,
    search?: string,
    status?: "active" | "inactive"
  ): Promise<PaginatedResponse<Employee>> {
    return apiClient.get<PaginatedResponse<Employee>>("/employees", {
      page,
      per_page: perPage,
      search,
      status,
    });
  },

  async get(uuid: string): Promise<SingleResponse<Employee>> {
    return apiClient.get<SingleResponse<Employee>>(`/employees/${uuid}`);
  },

  async create(data: CreateEmployeeData): Promise<SingleResponse<Employee> & { initial_password: string }> {
    return apiClient.post<SingleResponse<Employee> & { initial_password: string }>("/employees", data);
  },

  async update(uuid: string, data: UpdateEmployeeData): Promise<SingleResponse<Employee>> {
    return apiClient.put<SingleResponse<Employee>>(`/employees/${uuid}`, data);
  },

  async delete(uuid: string): Promise<void> {
    await apiClient.delete(`/employees/${uuid}`);
  },

  async getApplications(uuid: string): Promise<{ data: Employee["applications"] }> {
    return apiClient.get<{ data: Employee["applications"] }>(`/employees/${uuid}/applications`);
  },

  async grantAccess(
    employeeUuid: string,
    applicationUuid: string,
    role: Role
  ): Promise<MessageResponse> {
    return apiClient.post<MessageResponse>(`/employees/${employeeUuid}/applications`, {
      application_uuid: applicationUuid,
      role,
    });
  },

  async updateAccess(
    employeeUuid: string,
    applicationUuid: string,
    role: Role
  ): Promise<MessageResponse> {
    return apiClient.put<MessageResponse>(
      `/employees/${employeeUuid}/applications/${applicationUuid}`,
      { role }
    );
  },

  async revokeAccess(employeeUuid: string, applicationUuid: string): Promise<MessageResponse> {
    return apiClient.delete<MessageResponse>(
      `/employees/${employeeUuid}/applications/${applicationUuid}`
    );
  },
};
