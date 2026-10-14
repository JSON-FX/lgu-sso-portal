/**
 * Office API Service
 *
 * Real API implementation for office management endpoints.
 */

import { apiClient } from "./client";
import { Office, ManagedOffice } from "@/types";

export const officeApi = {
  async listAll(): Promise<{ data: ManagedOffice[] }> {
    return apiClient.get<{ data: ManagedOffice[] }>("/offices", { include_inactive: 1 });
  },

  async create(values: Pick<Office, "name" | "abbreviation">): Promise<{ data: ManagedOffice }> {
    return apiClient.post<{ data: ManagedOffice }>("/offices", values);
  },

  async update(id: number, values: Partial<Pick<ManagedOffice, "name" | "abbreviation" | "is_active">>): Promise<{ data: ManagedOffice }> {
    return apiClient.put<{ data: ManagedOffice }>(`/offices/${id}`, values);
  },
  async list(): Promise<{ data: Office[] }> {
    return apiClient.get<{ data: Office[] }>("/offices");
  },

  async get(id: number): Promise<{ data: Office }> {
    return apiClient.get<{ data: Office }>(`/offices/${id}`);
  },
};
