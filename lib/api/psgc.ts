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

// Local preview data follows the same region → province → city → barangay contract.
const previewRegions: PSGCRegion[] = [
  { code: "0300000000", name: "Region III - Central Luzon" },
  { code: "0400000000", name: "CALABARZON" },
  { code: "1300000000", name: "National Capital Region" },
];
const previewProvinces: PSGCProvince[] = [
  { code: "0354000000", name: "Pampanga" },
  { code: "0314000000", name: "Bulacan" },
];
const previewCities: PSGCMunicipality[] = [
  { code: "0354160000", name: "San Fernando", type: "City", zip_code: "2000", district: "" },
  { code: "0354010000", name: "Angeles City", type: "City", zip_code: "2009", district: "" },
];
const previewBarangays: PSGCBarangay[] = [
  { code: "0354160001", name: "Alasas", status: "" },
  { code: "0354160002", name: "Bulaon", status: "" },
];

async function fetchPSGC<T>(endpoint: string): Promise<T> {
  const response = await apiClient.get<{ data: T }>(`/locations${endpoint}`);
  return response.data;
}

export const psgcApi = {
  async getRegions(): Promise<PSGCRegion[]> {
    if (process.env.NEXT_PUBLIC_USE_MOCK_API === "true") return previewRegions;
    return fetchPSGC<PSGCRegion[]>("/regions");
  },

  async getProvinces(regionCode: string): Promise<PSGCProvince[]> {
    if (process.env.NEXT_PUBLIC_USE_MOCK_API === "true") return regionCode === "0300000000" ? previewProvinces : [];
    return fetchPSGC<PSGCProvince[]>(`/regions/${encodeURIComponent(regionCode)}/provinces`);
  },

  async getMunicipalities(provinceCode: string): Promise<PSGCMunicipality[]> {
    if (process.env.NEXT_PUBLIC_USE_MOCK_API === "true") return provinceCode === "0354000000" ? previewCities : [];
    return fetchPSGC<PSGCMunicipality[]>(`/provinces/${encodeURIComponent(provinceCode)}/cities`);
  },

  async getBarangays(municipalityCode: string): Promise<PSGCBarangay[]> {
    if (process.env.NEXT_PUBLIC_USE_MOCK_API === "true") return municipalityCode === "0354160000" ? previewBarangays : [];
    return fetchPSGC<PSGCBarangay[]>(`/cities/${encodeURIComponent(municipalityCode)}/barangays`);
  },
};
