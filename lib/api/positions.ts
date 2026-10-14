/**
 * Position API Service
 *
 * Real API implementation for position management endpoints.
 */

import { apiClient } from "./client";
import { ManagedPosition, Position } from "@/types";

export const positionApi = {
  async listAll(): Promise<{ data: ManagedPosition[] }> {
    return apiClient.get<{ data: ManagedPosition[] }>("/positions", { include_inactive: 1 });
  },

  async create(values: Pick<Position, "title">): Promise<{ data: ManagedPosition }> {
    return apiClient.post<{ data: ManagedPosition }>("/positions", values);
  },

  async update(id: number, values: Partial<Pick<ManagedPosition, "title" | "is_active">>): Promise<{ data: ManagedPosition }> {
    return apiClient.put<{ data: ManagedPosition }>(`/positions/${id}`, values);
  },

  async list(): Promise<{ data: Position[] }> {
    return apiClient.get<{ data: Position[] }>("/positions");
  },
};
