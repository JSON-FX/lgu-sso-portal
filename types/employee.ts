export interface Location {
  code: string;
  name: string;
}

export interface Office {
  id: number;
  name: string;
  abbreviation: string;
}

export interface ManagedOffice extends Office {
  is_active: boolean;
}

export interface Position {
  id: number;
  title: string;
}

export interface ManagedPosition extends Position {
  is_active: boolean;
}

export interface Employee {
  uuid: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  full_name: string;
  initials: string;
  avatar_version?: string | null;
  avatar_endpoint?: string | null;
  birthday: string;
  age: number;
  civil_status: "single" | "married" | "widowed" | "separated" | "divorced";
  email: string;
  username: string;
  must_change_password: boolean;
  is_active: boolean;
  nationality: string;
  residence: string | null;
  block_number: string | null;
  building_floor: string | null;
  house_number: string | null;
  region: string | null;
  province: string | null;
  city: string | null;
  barangay: string | null;
  office: Office | null;
  position: Position | null;
  date_employed: string | null;
  date_terminated: string | null;
  created_at: string;
  updated_at: string;
  applications?: EmployeeApplication[];
}

export interface EmployeeApplication {
  uuid: string;
  name: string;
  role: Role;
}

export type Role = "guest" | "standard" | "administrator" | "super_administrator";

export interface CreateEmployeeData {
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  birthday: string;
  civil_status: Employee["civil_status"];
  region: string;
  province: string;
  city: string;
  barangay: string;
  block_number?: string;
  building_floor?: string;
  house_number?: string;
  residence?: string | null;
  nationality: string;
  email?: string;
  password?: string;
  office_id?: number;
  position_id?: number;
  date_employed?: string;
  date_terminated?: string;
}

export interface UpdateEmployeeData {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  suffix?: string;
  birthday?: string;
  civil_status?: Employee["civil_status"];
  region?: string;
  province?: string;
  city?: string;
  barangay?: string;
  block_number?: string;
  building_floor?: string;
  house_number?: string;
  residence?: string | null;
  nationality?: string;
  email?: string;
  is_active?: boolean;
  office_id?: number;
  position_id?: number;
  date_employed?: string;
  date_terminated?: string;
}

export interface GrantAppAccessData {
  application_uuid: string;
  role: Role;
}

export interface UpdateAppAccessData {
  role: Role;
}
