import type { auditActionLabels } from "@/lib/audit-action";

export type AuditAction = keyof typeof auditActionLabels;

export interface AuditLog {
  id: number;
  action: string;
  employee: {
    uuid: string;
    full_name: string;
  } | null;
  application: {
    uuid: string;
    name: string;
  } | null;
  ip_address: string;
  user_agent: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuditLogFilters {
  action?: AuditAction;
  employee_uuid?: string;
  application_uuid?: string;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
}
