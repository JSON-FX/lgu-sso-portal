"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { PortalStatus } from "@/components/portal/design";
import { PortalSelect } from "@/components/portal/selection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import type { Employee, PaginatedResponse } from "@/types";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [meta, setMeta] = useState<PaginatedResponse<Employee>["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await api.employees.list(page, 15, search || undefined, status === "all" ? undefined : status as "active" | "inactive");
      setEmployees(result.data); setMeta(result.meta);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "We couldn’t load employees."); }
    finally { setLoading(false); }
  }, [page, search, status]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  useEffect(() => { const timer = window.setTimeout(() => { setPage(1); setSearch(query.trim()); }, 250); return () => window.clearTimeout(timer); }, [query]);

  return <div className="lp-admin">
    <header className="lp-admin-heading"><div><p className="lp-admin-eyebrow">People & access</p><h1>Employees</h1><p className="lp-admin-description">Find an employee, keep their record current, and manage application access.</p></div><Button asChild><Link href="/employees/new"><Plus aria-hidden="true" />Add employee</Link></Button></header>
    <div className="lp-admin-toolbar"><div className="lp-admin-search"><Search size={18} aria-hidden="true" /><Input aria-label="Search employees by name or email" placeholder="Search by name or email" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={255} /></div><div className="lp-admin-filter"><PortalSelect label="Employee status" value={status} options={[{ value: "all", label: "All statuses" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} onValueChange={(value) => { setPage(1); setStatus(value); }} /></div><span className="lp-admin-hint">{meta ? `${meta.total} ${meta.total === 1 ? "record" : "records"}` : ""}</span></div>
    {error ? <PortalStatus kind="error" title="We couldn’t load employees." action={<Button variant="outline" onClick={() => void load()}>Try again</Button>}>{error}</PortalStatus> : <div className="lp-admin-table"><Table><TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Office</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Manage</TableHead></TableRow></TableHeader><TableBody>
      {loading ? [1, 2, 3, 4].map((item) => <TableRow key={item}><TableCell colSpan={4}><Skeleton className="h-10 w-full" /></TableCell></TableRow>) : employees.length ? employees.map((employee) => <TableRow key={employee.uuid}><TableCell><strong>{employee.full_name}</strong><small>{employee.username}</small></TableCell><TableCell>{employee.office?.name || "No office assigned"}<small>{employee.position?.title || "No position assigned"}</small></TableCell><TableCell><Badge variant="secondary">{employee.is_active ? "Active" : "Inactive"}</Badge></TableCell><TableCell className="text-right"><div className="lp-admin-row-actions"><Button variant="ghost" size="sm" asChild><Link href={`/employees/${employee.uuid}`} aria-label={`Edit ${employee.full_name}`}>Edit</Link></Button><Button variant="outline" size="sm" asChild><Link href={`/employees/${employee.uuid}/applications`} aria-label={`Manage access for ${employee.full_name}`}>Access<ArrowRight aria-hidden="true" /></Link></Button></div></TableCell></TableRow>) : <TableRow><TableCell colSpan={4}><div className="lp-admin-empty">{search || status !== "all" ? "No employees match these filters." : "No employees yet. Add an employee to begin."}</div></TableCell></TableRow>}
    </TableBody></Table></div>}
    {!error && !loading && meta && meta.last_page > 1 && <div className="lp-admin-pagination"><span>Showing {meta.from}–{meta.to} of {meta.total} employees</span><div><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft aria-hidden="true" />Previous</Button><span>Page {meta.current_page} of {meta.last_page}</span><Button variant="outline" size="sm" disabled={page >= meta.last_page} onClick={() => setPage(page + 1)}>Next<ChevronRight aria-hidden="true" /></Button></div></div>}
  </div>;
}
