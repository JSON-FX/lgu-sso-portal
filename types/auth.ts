import { Employee, EmployeeApplication } from "./employee";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  first_name: string;
  middle_name?: string;
  last_name: string;
}

export interface RegisterResponse {
  username: string;
  message: string;
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
}

export interface LoginResponse {
  access_token?: string;
  token_type: string;
  employee: Employee;
}

export interface AuthUser extends Employee {
  applications: EmployeeApplication[];
}

export interface MeResponse {
  data: AuthUser;
}

// Alias for backward compatibility
export type RegisterRequest = RegisterData;
