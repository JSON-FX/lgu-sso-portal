import { CreateEmployeeData, Employee, EmployeeApplication, Office, Position } from "./employee";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegistrationApplication {
  uuid: string;
  name: string;
  description: string | null;
  default_role: "guest" | "standard";
}

export interface RegistrationOptions {
  applications: RegistrationApplication[];
  offices: Office[];
  positions: Position[];
}

export interface RegisterData extends Omit<CreateEmployeeData, "password" | "email" | "date_terminated" | "date_employed"> {
  email: string;
  password: string;
  password_confirmation: string;
  applications: string[];
}

export interface RegisterResponse {
  username: string;
  message: string;
  applications: { uuid: string; name: string; role: "guest" | "standard" }[];
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
