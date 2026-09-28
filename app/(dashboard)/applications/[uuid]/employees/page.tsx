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
import type { Application, ApplicationEmployee, Employee, Role } from "@/types";

export default function ApplicationEmployeesPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const [application, setApplication] = useState<Application | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [grants, setGrants] = useState<ApplicationEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [app, first, access] = await Promise.all([api.applications.get(uuid), api.employees.list(1, 100), api.applications.getEmployees(uuid)]);
      const all = [...first.data];
      for (let page = 2; page <= first.meta.last_page; page++) all.push(...(await api.employees.list(page, 100)).data);
      setApplication(app.data); setEmployees(all); setGrants(access.data || []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Access records could not be loaded."); }
    finally { setLoading(false); }
  }, [uuid]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  const update = async (action: () => Promise<unknown>, message: string) => { await action(); await load(); toast.success(message); };
  const assignedIds = new Set(grants.map((item) => item.uuid));
  return <div className="lp-admin">
    <Button variant="ghost" asChild className="lp-admin-back"><Link href="/applications"><ArrowLeft aria-hidden="true" />Applications</Link></Button>
    {loading && !application ? <div aria-label="Loading access records"><Skeleton className="h-12 w-80 mb-8" /><Skeleton className="h-64 w-full" /></div> : error ? <PortalStatus kind="error" title="We couldn’t load access records." action={<Button variant="outline" onClick={() => void load()}>Try again</Button>}>{error}</PortalStatus> : application && <>
      <header className="lp-admin-heading"><div><p className="lp-admin-eyebrow">Application access</p><h1>{application.name}</h1><p className="lp-admin-description">Review the employees and shared roles granted to this application.</p></div></header>
      <AccessGrants subject="Employee" assigned={grants.map((item) => ({ id: item.uuid, name: item.full_name, role: item.role }))} available={employees.filter((item) => !assignedIds.has(item.uuid)).map((item) => ({ id: item.uuid, name: item.full_name }))} onGrant={(id, role: Role) => update(() => api.applications.grantAccess(uuid, id, role), "Access granted.")} onChange={(id, role: Role) => update(() => api.applications.updateAccess(uuid, id, role), "Role updated.")} onRevoke={(id) => update(() => api.applications.revokeAccess(uuid, id), "Access revoked.")} />
    </>}
  </div>;
}
