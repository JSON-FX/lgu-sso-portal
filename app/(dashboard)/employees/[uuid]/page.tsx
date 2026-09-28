"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmployeeForm, type EmployeeFormValues } from "@/components/portal/employee-form";
import { PortalStatus } from "@/components/portal/design";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { Employee } from "@/types";

export default function EmployeeDetailPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setEmployee((await api.employees.get(uuid)).data); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Employee could not be loaded."); }
    finally { setLoading(false); }
  }, [uuid]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  const save = async (values: EmployeeFormValues) => {
    const response = await api.employees.update(uuid, values);
    setEmployee(response.data);
    toast.success("Employee record saved.");
  };
  const remove = async () => {
    setDeleting(true); setDeleteError("");
    try { await api.employees.delete(uuid); router.push("/employees"); toast.success("Employee deleted."); }
    catch (cause) { setDeleteError(cause instanceof Error ? cause.message : "Employee could not be deleted."); setDeleting(false); }
  };

  return <div className="lp-admin">
    <Button variant="ghost" asChild className="lp-admin-back"><Link href="/employees"><ArrowLeft aria-hidden="true" />Employees</Link></Button>
    {loading ? <div aria-label="Loading employee"><Skeleton className="h-12 w-80 mb-8" /><Skeleton className="h-80 w-full" /></div> : error || !employee ? <PortalStatus kind="error" title="We couldn’t load this employee." action={<Button variant="outline" onClick={() => void load()}>Try again</Button>}>{error || "The record is unavailable."}</PortalStatus> : <>
      <header className="lp-admin-heading"><div><p className="lp-admin-eyebrow">Employee record</p><h1>{employee.full_name}</h1><p className="lp-admin-description">Keep personal, employment, and account information in one record.</p></div><Button variant="outline" asChild><Link href={`/employees/${uuid}/applications`}>Manage access<ArrowRight aria-hidden="true" /></Link></Button></header>
      <EmployeeForm key={uuid} initial={employee} onSave={save} onCancel={() => router.push("/employees")} submitLabel="Save changes" />
      <section className="lp-admin-section lp-admin-danger"><div className="lp-admin-section-heading"><h2>Delete employee</h2><p>Deleting the employee ends their sessions and removes all application grants.</p></div><Button variant="destructive" onClick={() => setConfirmDelete(true)}><Trash2 aria-hidden="true" />Delete employee</Button></section>
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}><DialogContent><DialogHeader><DialogTitle>Delete {employee.full_name}?</DialogTitle><DialogDescription>This permanently removes the employee record and their application access.</DialogDescription></DialogHeader>{deleteError && <PortalStatus kind="error" title="Deletion failed.">{deleteError}</PortalStatus>}<DialogFooter><Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancel</Button><Button variant="destructive" onClick={() => void remove()} disabled={deleting}>{deleting ? "Deleting…" : "Delete employee"}</Button></DialogFooter></DialogContent></Dialog>
    </>}
  </div>;
}
