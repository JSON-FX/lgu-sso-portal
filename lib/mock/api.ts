/**
 * Mock API Service
 *
 * This module provides mock implementations of the LGU-SSO API endpoints.
 * Use this during frontend development to avoid backend dependencies.
 *
 * To switch to real API:
 * 1. Set NEXT_PUBLIC_USE_MOCK_API=false in .env.local
 * 2. Ensure LGU-SSO backend is running at http://lgu-sso.test
 */

import {
  Employee,
  EmployeeApplication,
  Application,
  AuditLog,
  AuthUser,
  Location,
  Office,
  Position,
  CreateEmployeeData,
  UpdateEmployeeData,
  CreateApplicationData,
  UpdateApplicationData,
  Role,
  PaginatedResponse,
  SingleResponse,
  MessageResponse,
  AuditLogFilters,
  LoginResponse,
  ApplicationWithSecret,
  ApplicationEmployee,
} from "@/types";

import { UpdatePortalProfileData } from "@/types/portal";
import { ApiError } from "@/lib/api/client";

import {
  mockEmployees,
  mockApplications,
  mockAuditLogs,
  mockCurrentUser,
  mockProvinces,
  mockCities,
  mockBarangays,
  mockOffices,
  mockPositions,
  MOCK_CREDENTIALS,
} from "./data";

// Simulate network delay
const delay = (ms: number = 300) => new Promise((resolve) => setTimeout(resolve, ms));

// Generate random UUID
const generateUUID = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// In-memory data stores (mutable copies)
let employees = [...mockEmployees];
let applications = [...mockApplications];
let auditLogs = [...mockAuditLogs];
let currentToken: string | null = null;
let currentLoggedInEmployee: Employee | null = null;

// ============================================
// AUTH ENDPOINTS
// ============================================

export const mockAuthApi = {
  async login({ username, password }: { username: string; password: string }): Promise<LoginResponse> {
    await delay(500);

    // Check hardcoded admin credentials first
    if (username === MOCK_CREDENTIALS.username && password === MOCK_CREDENTIALS.password) {
      const employee = employees.find((e) => e.username === username);
      if (!employee) {
        throw new Error("Invalid credentials.");
      }

      currentToken = `mock-jwt-token-${Date.now()}`;
      currentLoggedInEmployee = employee;
      return {
        access_token: currentToken,
        token_type: "bearer",
        employee: {
          ...employee,
          username: employee.username,
          must_change_password: employee.must_change_password,
        },
      };
    }

    // Check dynamically registered users — accept any password for mock
    const employee = employees.find((e) => e.username === username);
    if (employee) {
      currentToken = `mock-jwt-token-${Date.now()}`;
      currentLoggedInEmployee = employee;
      return {
        access_token: currentToken,
        token_type: "bearer",
        employee: {
          ...employee,
          username: employee.username,
          must_change_password: employee.must_change_password,
        },
      };
    }

    throw new Error("Invalid credentials.");
  },

  async register({ first_name, middle_name, last_name }: { first_name: string; middle_name?: string; last_name: string }): Promise<{ username: string; message: string }> {
    await delay(500);

    // Generate username: first_initial.last_name lowercased, remove spaces from last name
    const firstInitial = first_name[0].toLowerCase();
    const normalizedLastName = last_name.toLowerCase().replace(/\s+/g, "");
    const baseUsername = `${firstInitial}.${normalizedLastName}`;
    let username = baseUsername;

    // Check for collision, append number if needed
    let counter = 1;
    while (employees.some((e) => e.username === username)) {
      counter++;
      username = `${baseUsername}${counter}`;
    }

    // Create new employee
    const newEmployee: Employee = {
      uuid: `emp-${generateUUID()}`,
      first_name,
      middle_name: middle_name || null,
      last_name,
      suffix: null,
      full_name: [first_name, middle_name, last_name].filter(Boolean).join(" "),
      initials: [first_name[0], middle_name?.[0], last_name[0]].filter(Boolean).join("."),
      birthday: "2000-01-01",
      age: 26,
      civil_status: "single",
      email: `${username}@lgu.gov.ph`,
      username,
      must_change_password: true,
      is_active: true,
      nationality: "Filipino",
      residence: "",
      block_number: null,
      building_floor: null,
      house_number: null,
      region: null,
      province: null,
      city: null,
      barangay: null,
      office: null,
      position: null,
      date_employed: null,
      date_terminated: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      applications: applications
        .filter((app) => app.is_active)
        .map((app) => ({
          uuid: app.uuid,
          name: app.name,
          role: "guest" as Role,
        })),
    };

    employees.unshift(newEmployee);

    return { username, message: "Registration successful" };
  },

  async changePassword({ current_password, new_password }: { current_password: string; new_password: string }): Promise<MessageResponse> {
    await delay(400);

    // Mock validation: check current_password is non-empty
    if (!current_password) {
      throw new Error("Current password is required.");
    }

    if (!new_password) {
      throw new Error("New password is required.");
    }

    // Update the logged-in employee's must_change_password flag
    if (currentLoggedInEmployee) {
      currentLoggedInEmployee.must_change_password = false;
      const emp = employees.find((e) => e.uuid === currentLoggedInEmployee!.uuid);
      if (emp) emp.must_change_password = false;
    } else {
      // Fallback to mockCurrentUser
      const currentEmployee = employees.find((e) => e.uuid === mockCurrentUser.uuid);
      if (currentEmployee) currentEmployee.must_change_password = false;
      (mockCurrentUser as AuthUser & { must_change_password: boolean }).must_change_password = false;
    }

    return { message: "Password changed successfully" };
  },

  async logout(): Promise<MessageResponse> {
    await delay(200);
    currentToken = null;
    return { message: "Successfully logged out." };
  },

  async logoutAll(): Promise<MessageResponse> {
    await delay(200);
    currentToken = null;
    return { message: "Successfully logged out from all sessions." };
  },

  async me(): Promise<{ data: AuthUser }> {
    await delay(200);

    if (!currentToken) {
      throw new ApiError("Unauthenticated.", 401);
    }

    // Return the actual logged-in employee, not always the default admin
    if (currentLoggedInEmployee) {
      return {
        data: {
          ...currentLoggedInEmployee,
          applications: currentLoggedInEmployee.applications || mockCurrentUser.applications,
        } as AuthUser,
      };
    }

    return { data: mockCurrentUser };
  },

  async refresh(): Promise<{ access_token: string; token_type: string }> {
    await delay(200);

    if (!currentToken) {
      throw new Error("Unauthenticated.");
    }

    currentToken = `mock-jwt-token-${Date.now()}`;
    return { access_token: currentToken, token_type: "bearer" };
  },

  // Helper to set token (for initialization)
  setToken(token: string | null) {
    currentToken = token;
  },

  hasToken() {
    return !!currentToken;
  },
};

// ============================================
// EMPLOYEE ENDPOINTS
// ============================================

export const mockEmployeeApi = {
  async list(
    page: number = 1,
    perPage: number = 15,
    search?: string,
    status?: "active" | "inactive"
  ): Promise<PaginatedResponse<Employee>> {
    await delay(400);

    let filtered = [...employees];

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.full_name.toLowerCase().includes(searchLower) ||
          e.email.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (status) {
      filtered = filtered.filter((e) => (status === "active" ? e.is_active : !e.is_active));
    }

    // Calculate pagination
    const total = filtered.length;
    const lastPage = Math.ceil(total / perPage);
    const from = (page - 1) * perPage;
    const to = Math.min(from + perPage, total);
    const data = filtered.slice(from, to);

    return {
      data,
      links: {
        first: "?page=1",
        last: `?page=${lastPage}`,
        prev: page > 1 ? `?page=${page - 1}` : null,
        next: page < lastPage ? `?page=${page + 1}` : null,
      },
      meta: {
        current_page: page,
        from: data.length > 0 ? from + 1 : null,
        last_page: lastPage,
        per_page: perPage,
        to: data.length > 0 ? to : null,
        total,
      },
    };
  },

  async get(uuid: string): Promise<SingleResponse<Employee>> {
    await delay(300);

    const employee = employees.find((e) => e.uuid === uuid);
    if (!employee) {
      throw new Error("Employee not found.");
    }

    return { data: employee };
  },

  async create(data: CreateEmployeeData): Promise<SingleResponse<Employee>> {
    await delay(500);

    // Check for duplicate email
    if (employees.some((e) => e.email === data.email)) {
      throw new Error("Email already exists.");
    }

    const office = data.office_id ? mockOffices.find((o) => o.id === data.office_id) : null;
    const position = data.position_id ? mockPositions.find((p) => p.id === data.position_id) : null;

    const newEmployee: Employee = {
      uuid: `emp-${generateUUID()}`,
      first_name: data.first_name,
      middle_name: data.middle_name || null,
      last_name: data.last_name,
      suffix: data.suffix || null,
      full_name: [data.first_name, data.middle_name, data.last_name, data.suffix]
        .filter(Boolean)
        .join(" "),
      initials: [data.first_name[0], data.middle_name?.[0], data.last_name[0]]
        .filter(Boolean)
        .join("."),
      birthday: data.birthday,
      age: Math.floor(
        (Date.now() - new Date(data.birthday).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      ),
      civil_status: data.civil_status,
      email: data.email || `${data.first_name[0].toLowerCase()}.${data.last_name.toLowerCase().replace(/\s+/g, "")}@lgu.gov.ph`,
      username: `${data.first_name[0].toLowerCase()}.${data.last_name.toLowerCase().replace(/\s+/g, "")}`,
      must_change_password: true,
      is_active: true,
      nationality: data.nationality,
      residence: data.residence,
      block_number: data.block_number || null,
      building_floor: data.building_floor || null,
      house_number: data.house_number || null,
      region: data.region || null,
      province: data.province || null,
      city: data.city || null,
      barangay: data.barangay || null,
      office: office || null,
      position: position || null,
      date_employed: data.date_employed || null,
      date_terminated: data.date_terminated || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      applications: [],
    };

    employees.unshift(newEmployee);
    return { data: newEmployee };
  },

  async update(uuid: string, data: UpdateEmployeeData): Promise<SingleResponse<Employee>> {
    await delay(400);

    const index = employees.findIndex((e) => e.uuid === uuid);
    if (index === -1) {
      throw new Error("Employee not found.");
    }

    const updated = {
      ...employees[index],
      ...data,
      updated_at: new Date().toISOString(),
    };

    // Recalculate full_name if name fields changed
    if (data.first_name || data.middle_name || data.last_name || data.suffix) {
      updated.full_name = [
        updated.first_name,
        updated.middle_name,
        updated.last_name,
        updated.suffix,
      ]
        .filter(Boolean)
        .join(" ");
    }

    employees[index] = updated;
    return { data: updated };
  },

  async delete(uuid: string): Promise<void> {
    await delay(300);

    const index = employees.findIndex((e) => e.uuid === uuid);
    if (index === -1) {
      throw new Error("Employee not found.");
    }

    employees.splice(index, 1);
  },

  async getApplications(uuid: string): Promise<{ data: Employee["applications"] }> {
    await delay(300);

    const employee = employees.find((e) => e.uuid === uuid);
    if (!employee) {
      throw new Error("Employee not found.");
    }

    return { data: employee.applications || [] };
  },

  async grantAccess(
    employeeUuid: string,
    applicationUuid: string,
    role: Role
  ): Promise<MessageResponse> {
    await delay(400);

    const employeeIndex = employees.findIndex((e) => e.uuid === employeeUuid);
    if (employeeIndex === -1) {
      throw new Error("Employee not found.");
    }

    const application = applications.find((a) => a.uuid === applicationUuid);
    if (!application) {
      throw new Error("Application not found.");
    }

    const employee = employees[employeeIndex];
    if (!employee.applications) {
      employee.applications = [];
    }

    // Check if already has access
    if (employee.applications.some((a) => a.uuid === applicationUuid)) {
      throw new Error("Employee already has access to this application.");
    }

    employee.applications.push({
      uuid: applicationUuid,
      name: application.name,
      role,
    });

    return { message: "Access granted." };
  },

  async updateAccess(employeeUuid: string, applicationUuid: string, role: Role): Promise<MessageResponse> {
    await delay(300);

    const employee = employees.find((e) => e.uuid === employeeUuid);
    if (!employee) {
      throw new Error("Employee not found.");
    }

    const appAccess = employee.applications?.find((a) => a.uuid === applicationUuid);
    if (!appAccess) {
      throw new Error("Employee does not have access to this application.");
    }

    appAccess.role = role;
    return { message: "Access updated." };
  },

  async revokeAccess(employeeUuid: string, applicationUuid: string): Promise<MessageResponse> {
    await delay(300);

    const employee = employees.find((e) => e.uuid === employeeUuid);
    if (!employee) {
      throw new Error("Employee not found.");
    }

    const index = employee.applications?.findIndex((a) => a.uuid === applicationUuid) ?? -1;
    if (index === -1) {
      throw new Error("Employee does not have access to this application.");
    }

    employee.applications?.splice(index, 1);
    return { message: "Access revoked." };
  },
};

// ============================================
// APPLICATION ENDPOINTS
// ============================================

export const mockApplicationApi = {
  async list(): Promise<{ data: Application[] }> {
    await delay(400);
    return { data: applications };
  },

  async get(uuid: string): Promise<SingleResponse<Application>> {
    await delay(300);

    const application = applications.find((a) => a.uuid === uuid);
    if (!application) {
      throw new Error("Application not found.");
    }

    return { data: application };
  },

  async create(data: CreateApplicationData): Promise<{ data: ApplicationWithSecret }> {
    await delay(500);

    const clientId = `${data.name.toLowerCase().replace(/\s+/g, "-")}-${generateUUID().slice(0, 8)}`;
    const clientSecret = `secret-${generateUUID()}-${generateUUID()}`;

    const newApp: Application = {
      uuid: `app-${generateUUID()}`,
      name: data.name,
      description: data.description || null,
      client_id: clientId,
      redirect_uris: data.redirect_uris,
      rate_limit_per_minute: data.rate_limit_per_minute,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    applications.unshift(newApp);

    return {
      data: {
        ...newApp,
        client_secret: clientSecret,
      },
    };
  },

  async update(uuid: string, data: UpdateApplicationData): Promise<SingleResponse<Application>> {
    await delay(400);

    const index = applications.findIndex((a) => a.uuid === uuid);
    if (index === -1) {
      throw new Error("Application not found.");
    }

    applications[index] = {
      ...applications[index],
      ...data,
      updated_at: new Date().toISOString(),
    };

    return { data: applications[index] };
  },

  async delete(uuid: string): Promise<void> {
    await delay(300);

    const index = applications.findIndex((a) => a.uuid === uuid);
    if (index === -1) {
      throw new Error("Application not found.");
    }

    // Remove app access from all employees
    employees.forEach((emp) => {
      if (emp.applications) {
        emp.applications = emp.applications.filter((a) => a.uuid !== uuid);
      }
    });

    applications.splice(index, 1);
  },

  async regenerateSecret(uuid: string): Promise<{ data: { client_secret: string } }> {
    await delay(400);

    const application = applications.find((a) => a.uuid === uuid);
    if (!application) {
      throw new Error("Application not found.");
    }

    return { data: { client_secret: `secret-${generateUUID()}-${generateUUID()}` } };
  },

  async getEmployees(uuid: string): Promise<{ data: ApplicationEmployee[] }> {
    await delay(400);

    const application = applications.find((a) => a.uuid === uuid);
    if (!application) {
      throw new Error("Application not found.");
    }

    const employeesWithAccess: ApplicationEmployee[] = employees
      .filter((e) => e.applications?.some((a) => a.uuid === uuid))
      .map((e) => ({
        uuid: e.uuid,
        first_name: e.first_name,
        last_name: e.last_name,
        full_name: e.full_name,
        initials: e.initials,
        email: e.email,
        role: e.applications?.find((a) => a.uuid === uuid)?.role || "guest" as Role,
      }));

    return { data: employeesWithAccess };
  },

  async grantAccess(
    applicationUuid: string,
    employeeUuid: string,
    role: Role
  ): Promise<MessageResponse> {
    await delay(400);

    const application = applications.find((a) => a.uuid === applicationUuid);
    if (!application) {
      throw new Error("Application not found.");
    }

    const employeeIndex = employees.findIndex((e) => e.uuid === employeeUuid);
    if (employeeIndex === -1) {
      throw new Error("Employee not found.");
    }

    const employee = employees[employeeIndex];
    if (!employee.applications) {
      employee.applications = [];
    }

    // Check if already has access
    if (employee.applications.some((a) => a.uuid === applicationUuid)) {
      throw new Error("Employee already has access to this application.");
    }

    employee.applications.push({
      uuid: applicationUuid,
      name: application.name,
      role,
    });

    return { message: "Access granted." };
  },

  async updateAccess(
    applicationUuid: string,
    employeeUuid: string,
    role: Role
  ): Promise<MessageResponse> {
    await delay(300);

    const employee = employees.find((e) => e.uuid === employeeUuid);
    if (!employee) {
      throw new Error("Employee not found.");
    }

    const appAccess = employee.applications?.find((a) => a.uuid === applicationUuid);
    if (!appAccess) {
      throw new Error("Employee does not have access to this application.");
    }

    appAccess.role = role;
    return { message: "Access updated." };
  },

  async revokeAccess(applicationUuid: string, employeeUuid: string): Promise<MessageResponse> {
    await delay(300);

    const employee = employees.find((e) => e.uuid === employeeUuid);
    if (!employee) {
      throw new Error("Employee not found.");
    }

    const index = employee.applications?.findIndex((a) => a.uuid === applicationUuid) ?? -1;
    if (index === -1) {
      throw new Error("Employee does not have access to this application.");
    }

    employee.applications?.splice(index, 1);
    return { message: "Access revoked." };
  },
};

// ============================================
// AUDIT LOG ENDPOINTS
// ============================================

export const mockAuditApi = {
  async list(filters: AuditLogFilters = {}): Promise<PaginatedResponse<AuditLog>> {
    await delay(400);

    let filtered = [...auditLogs];

    // Apply filters
    if (filters.action) {
      filtered = filtered.filter((log) => log.action === filters.action);
    }

    if (filters.employee_uuid) {
      filtered = filtered.filter((log) => log.employee?.uuid === filters.employee_uuid);
    }

    if (filters.application_uuid) {
      filtered = filtered.filter((log) => log.application?.uuid === filters.application_uuid);
    }

    if (filters.from) {
      const fromDate = new Date(filters.from);
      filtered = filtered.filter((log) => new Date(log.created_at) >= fromDate);
    }

    if (filters.to) {
      const toDate = new Date(filters.to);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((log) => new Date(log.created_at) <= toDate);
    }

    // Pagination
    const page = filters.page || 1;
    const perPage = filters.per_page || 15;
    const total = filtered.length;
    const lastPage = Math.ceil(total / perPage);
    const from = (page - 1) * perPage;
    const to = Math.min(from + perPage, total);
    const data = filtered.slice(from, to);

    return {
      data,
      links: {
        first: "?page=1",
        last: `?page=${lastPage}`,
        prev: page > 1 ? `?page=${page - 1}` : null,
        next: page < lastPage ? `?page=${page + 1}` : null,
      },
      meta: {
        current_page: page,
        from: data.length > 0 ? from + 1 : null,
        last_page: lastPage,
        per_page: perPage,
        to: data.length > 0 ? to : null,
        total,
      },
    };
  },
};

// ============================================
// LOCATION ENDPOINTS
// ============================================

export const mockLocationApi = {
  async getProvinces(): Promise<{ data: Location[] }> {
    await delay(200);
    return { data: mockProvinces };
  },

  async getCities(provinceCode: string): Promise<{ data: Location[] }> {
    await delay(200);
    return { data: mockCities[provinceCode] || [] };
  },

  async getBarangays(cityCode: string): Promise<{ data: Location[] }> {
    await delay(200);
    return { data: mockBarangays[cityCode] || [] };
  },
};

// ============================================
// OFFICE ENDPOINTS
// ============================================

export const mockOfficeApi = {
  async list(): Promise<{ data: Office[] }> {
    await delay(200);
    return { data: mockOffices };
  },

  async get(id: number): Promise<{ data: Office }> {
    await delay(200);
    const office = mockOffices.find((o) => o.id === id);
    if (!office) {
      throw new Error("Office not found.");
    }
    return { data: office };
  },
};

// ============================================
// POSITION ENDPOINTS
// ============================================

export const mockPositionApi = {
  async list(): Promise<{ data: Position[] }> {
    await delay(200);
    return { data: mockPositions };
  },
};

// ============================================
// STATS HELPERS (for Dashboard)
// ============================================

export const mockStatsApi = {
  async getDashboardStats() {
    await delay(300);

    return {
      totalEmployees: employees.length,
      activeEmployees: employees.filter((e) => e.is_active).length,
      totalApplications: applications.length,
      activeApplications: applications.filter((a) => a.is_active).length,
      recentLogins: auditLogs.filter((log) => log.action === "login").length,
    };
  },
};

// ============================================
// SSO ENDPOINTS
// ============================================

export const mockSsoApi = {
  async validateRedirect({ client_id, redirect_uri }: { client_id: string; redirect_uri: string }): Promise<{ valid: boolean; application: { name: string; description: string | null } }> {
    await delay(300);

    const application = applications.find((a) => a.client_id === client_id);
    if (!application) {
      throw new Error("Invalid client_id.");
    }

    if (!application.redirect_uris.includes(redirect_uri)) {
      throw new Error("Invalid redirect_uri.");
    }

    return {
      valid: true,
      application: {
        name: application.name,
        description: application.description,
      },
    };
  },

  async sessionCheck(): Promise<{ authenticated: boolean; token?: string }> {
    await delay(200);
    return { authenticated: false };
  },

  async issueCode(): Promise<{ code: string; expires_in: number }> {
    await delay(200);
    return { code: `mock-code-${Date.now()}`, expires_in: 60 };
  },
};

// ============================================
// PORTAL ENDPOINTS
// ============================================

export const mockPortalApi = {
  async getOffices(): Promise<Office[]> {
    await delay(150);
    return mockOffices;
  },

  async getPositions(): Promise<Position[]> {
    await delay(150);
    return mockPositions;
  },

  async getProfile(): Promise<Employee> {
    await delay(300);
    const user = currentLoggedInEmployee || mockCurrentUser;
    return user as unknown as Employee;
  },

  async updateProfile(data: UpdatePortalProfileData): Promise<Employee> {
    await delay(400);

    const user = currentLoggedInEmployee || mockCurrentUser;
    Object.assign(user, data);
    if (data.office_id !== undefined) (user as Employee).office = mockOffices.find((office) => office.id === data.office_id) || null;
    if (data.position_id !== undefined) (user as Employee).position = mockPositions.find((position) => position.id === data.position_id) || null;
    (user as Employee).updated_at = new Date().toISOString();

    return user as unknown as Employee;
  },

  async getApplications(): Promise<EmployeeApplication[]> {
    await delay(300);
    const user = currentLoggedInEmployee || mockCurrentUser;
    return (user as unknown as AuthUser).applications || [];
  },
};

// Reset function for testing
export const resetMockData = () => {
  employees = [...mockEmployees];
  applications = [...mockApplications];
  auditLogs = [...mockAuditLogs];
  currentToken = null;
};
