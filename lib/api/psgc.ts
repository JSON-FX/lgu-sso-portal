/**
 * PSGC (Philippine Standard Geographic Code) API Service
 *
 * Uses the SSO backend's cached Philippine location endpoints.
 */

import { apiClient } from "./client";

export interface PSGCRegion {
  code: string;
  name: string;
}

export interface PSGCProvince {
  code: string;
  name: string;
}

export interface PSGCMunicipality {
  code: string;
  name: string;
  type: string; // "Mun" or "City"
  zip_code: string;
  district: string;
}

export interface PSGCBarangay {
  code: string;
  name: string;
  status: string;
}

async function fetchPSGC<T>(endpoint: string): Promise<T> {
  const response = await apiClient.get<{ data: T }>(`/locations${endpoint}`);
  return response.data;
}

export const psgcApi = {
  async getRegions(): Promise<PSGCRegion[]> {
    return fetchPSGC<PSGCRegion[]>("/regions");
  },

  async getProvinces(regionCode: string): Promise<PSGCProvince[]> {
    return fetchPSGC<PSGCProvince[]>(`/regions/${encodeURIComponent(regionCode)}/provinces`);
  },

  async getMunicipalities(provinceCode: string): Promise<PSGCMunicipality[]> {
    return fetchPSGC<PSGCMunicipality[]>(`/provinces/${encodeURIComponent(provinceCode)}/cities`);
  },

  async getBarangays(municipalityCode: string): Promise<PSGCBarangay[]> {
    return fetchPSGC<PSGCBarangay[]>(`/cities/${encodeURIComponent(municipalityCode)}/barangays`);
  },
};
