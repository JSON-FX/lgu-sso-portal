/**
 * Application API Service
 *
 * Real API implementation for application management endpoints.
 */

import { apiClient } from "./client";
import {
  Application,
  ApplicationWithSecret,
  ApplicationEmployee,
  CreateApplicationData,
  UpdateApplicationData,
  SingleResponse,
  MessageResponse,
  Role,
} from "@/types";

export const applicationApi = {
  async list(): Promise<{ data: Application[] }> {
    return apiClient.get<{ data: Application[] }>("/applications");
  },

  async get(uuid: string): Promise<SingleResponse<Application>> {
    return apiClient.get<SingleResponse<Application>>(`/applications/${uuid}`);
  },

  async create(data: CreateApplicationData): Promise<{ data: ApplicationWithSecret }> {
    const response = await apiClient.post<{ data: Application; client_secret: string }>("/applications", data);
    return { data: { ...response.data, client_secret: response.client_secret } };
  },

  async update(uuid: string, data: UpdateApplicationData): Promise<SingleResponse<Application>> {
    return apiClient.put<SingleResponse<Application>>(`/applications/${uuid}`, data);
  },

  async delete(uuid: string): Promise<void> {
    await apiClient.delete(`/applications/${uuid}`);
  },

  async regenerateSecret(uuid: string): Promise<{ data: { client_secret: string } }> {
    const response = await apiClient.post<{ client_secret: string }>(
      `/applications/${uuid}/regenerate-secret`
    );
    return { data: { client_secret: response.client_secret } };
  },

  async getEmployees(uuid: string): Promise<{ data: ApplicationEmployee[] }> {
    return apiClient.get<{ data: ApplicationEmployee[] }>(`/applications/${uuid}/employees`);
  },

  async grantAccess(
    applicationUuid: string,
    employeeUuid: string,
    role: Role
  ): Promise<MessageResponse> {
    return apiClient.post<MessageResponse>(`/applications/${applicationUuid}/employees`, {
      employee_uuid: employeeUuid,
      role,
    });
  },

  async updateAccess(
    applicationUuid: string,
    employeeUuid: string,
    role: Role
  ): Promise<MessageResponse> {
    return apiClient.put<MessageResponse>(
      `/applications/${applicationUuid}/employees/${employeeUuid}`,
      { role }
    );
  },

  async revokeAccess(applicationUuid: string, employeeUuid: string): Promise<MessageResponse> {
    return apiClient.delete<MessageResponse>(
      `/applications/${applicationUuid}/employees/${employeeUuid}`
    );
  },
};
