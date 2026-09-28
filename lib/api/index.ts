/**
 * API Service Layer
 *
 * This module provides a unified API interface that can switch between
 * mock and real API implementations based on environment configuration.
 *
 * Usage:
 * - Set NEXT_PUBLIC_USE_MOCK_API=true in .env.local for mock API
 * - Set NEXT_PUBLIC_USE_MOCK_API=false (or remove) for real API
 */

import { authApi } from "./auth";
import { employeeApi } from "./employees";
import { applicationApi } from "./applications";
import { auditApi } from "./audit";
import { locationApi } from "./locations";
import { officeApi } from "./offices";
import { positionApi } from "./positions";
import { statsApi } from "./stats";
import { portalApi as realPortalApi } from "./portal";
import { ssoApi as realSsoApi } from "./sso";

import {
  mockAuthApi,
  mockEmployeeApi,
  mockApplicationApi,
  mockAuditApi,
  mockLocationApi,
  mockOfficeApi,
  mockPositionApi,
  mockStatsApi,
  mockPortalApi,
  mockSsoApi,
} from "@/lib/mock";

// Check if we should use mock API
const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

// Export the appropriate API implementations
export const api = {
  auth: USE_MOCK_API ? mockAuthApi : authApi,
  employees: USE_MOCK_API ? mockEmployeeApi : employeeApi,
  applications: USE_MOCK_API ? mockApplicationApi : applicationApi,
  audit: USE_MOCK_API ? mockAuditApi : auditApi,
  locations: USE_MOCK_API ? mockLocationApi : locationApi,
  offices: USE_MOCK_API ? mockOfficeApi : officeApi,
  positions: USE_MOCK_API ? mockPositionApi : positionApi,
  stats: USE_MOCK_API ? mockStatsApi : statsApi,
};

export const portalApi = USE_MOCK_API ? mockPortalApi : realPortalApi;
export const ssoApi = USE_MOCK_API ? mockSsoApi : realSsoApi;

// Export individual APIs for direct imports
export { authApi, employeeApi, applicationApi, auditApi, locationApi, officeApi, positionApi, statsApi };
export { portalApi as realPortalApi } from "./portal";
export { ssoApi as realSsoApi } from "./sso";

// Export client utilities
export { ApiError } from "./client";

// Export a helper to check which API mode is active
export const isUsingMockApi = () => USE_MOCK_API;
