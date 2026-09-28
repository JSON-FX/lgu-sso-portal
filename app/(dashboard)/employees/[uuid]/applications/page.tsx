"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AccessGrants } from "@/components/portal/access-grants";
import { PortalStatus } from "@/components/portal/design";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { Application, Employee, EmployeeApplication, Role } from "@/types";

export default function EmployeeApplicationsPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [grants, setGrants] = useState<EmployeeApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [person, apps, access] = await Promise.all([api.employees.get(uuid), api.applications.list(), api.employees.getApplications(uuid)]);
      setEmployee(person.data); setApplications(apps.data); setGrants(access.data || []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Access records could not be loaded."); }
    finally { setLoading(false); }
  }, [uuid]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  const update = async (action: () => Promise<unknown>, message: string) => { await action(); await load(); toast.success(message); };
  const assignedIds = new Set(grants.map((item) => item.uuid));
  return <div className="lp-admin">
    <Button variant="ghost" asChild className="lp-admin-back"><Link href="/employees"><ArrowLeft aria-hidden="true" />Employees</Link></Button>
    {loading && !employee ? <div aria-label="Loading access records"><Skeleton className="h-12 w-80 mb-8" /><Skeleton className="h-64 w-full" /></div> : error ? <PortalStatus kind="error" title="We couldn’t load access records." action={<Button variant="outline" onClick={() => void load()}>Try again</Button>}>{error}</PortalStatus> : employee && <>
      <header className="lp-admin-heading"><div><p className="lp-admin-eyebrow">Employee access</p><h1>{employee.full_name}</h1><p className="lp-admin-description">{employee.office?.name || "No office assigned"} · {employee.username}</p></div></header>
      <AccessGrants subject="Application" assigned={grants.map((item) => ({ id: item.uuid, name: item.name, role: item.role }))} available={applications.filter((item) => !assignedIds.has(item.uuid)).map((item) => ({ id: item.uuid, name: item.name }))} onGrant={(id, role: Role) => update(() => api.employees.grantAccess(uuid, id, role), "Access granted.")} onChange={(id, role: Role) => update(() => api.employees.updateAccess(uuid, id, role), "Role updated.")} onRevoke={(id) => update(() => api.employees.revokeAccess(uuid, id), "Access revoked.")} />
    </>}
  </div>;
}
