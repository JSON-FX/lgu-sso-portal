"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { ArrowRight, ChevronLeft, ChevronRight, FileClock, RefreshCw, Search } from "lucide-react";
import { PortalStatus } from "@/components/portal/design";
import { PortalDatePicker, PortalSelect } from "@/components/portal/selection";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import type { Application, AuditAction, AuditLog, Employee, PaginatedResponse } from "@/types";

const actions: AuditAction[] = ["login", "logout", "logout_all", "token_refresh", "token_validate", "app_authorize"];
const actionName = (action: string) => action.split("_").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
const dateTime = (value: string) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : format(date, "dd MMM yyyy · HH:mm"); };

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState<PaginatedResponse<AuditLog>["meta"] | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("all");
  const [employee, setEmployee] = useState("all");
  const [application, setApplication] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [detail, setDetail] = useState<AuditLog | null>(null);
  const load = useCallback(async () => {
    if (from && to && from > to) return;
    setLoading(true); setError("");
    try {
      const response = await api.audit.list({ action: action === "all" ? undefined : action as AuditAction, employee_uuid: employee === "all" ? undefined : employee, application_uuid: application === "all" ? undefined : application, from: from || undefined, to: to || undefined, page, per_page: perPage });
      setLogs(response.data); setMeta(response.meta);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Audit events could not be loaded."); }
    finally { setLoading(false); }
  }, [action, employee, application, from, to, page, perPage]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  useEffect(() => {
    let active = true;
    void Promise.allSettled([api.employees.list(1, 100), api.applications.list()]).then(([people, apps]) => {
      if (!active) return;
      if (people.status === "fulfilled") setEmployees(people.value.data);
      if (apps.status === "fulfilled") setApplications(apps.value.data);
    });
    return () => { active = false; };
  }, []);
  const change = (setter: (value: string) => void, value: string) => { setter(value); setPage(1); };
  const reset = () => { setAction("all"); setEmployee("all"); setApplication("all"); setFrom(""); setTo(""); setQuery(""); setPage(1); };
  const visible = logs.filter((log) => `${actionName(log.action)} ${log.employee?.full_name || ""} ${log.application?.name || ""}`.toLowerCase().includes(query.toLowerCase()));

  return <div className="lp-admin">
    <header className="lp-admin-heading"><div><p className="lp-admin-eyebrow">Accountability</p><h1>Audit log</h1><p className="lp-admin-description">Trace identity and access changes. Select an event to inspect its recorded details.</p></div></header>
    <div className="lp-admin-toolbar"><div className="lp-admin-search"><Search size={18} aria-hidden="true" /><Input aria-label="Search displayed events" placeholder="Search displayed events" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="lp-admin-filter"><PortalSelect label="Event action" value={action} options={[{ value: "all", label: "All actions" }, ...actions.map((value) => ({ value, label: actionName(value) }))]} onValueChange={(value) => change(setAction, value)} /></div><span className="lp-admin-hint">{meta ? `${meta.total} ${meta.total === 1 ? "event" : "events"}` : ""}</span></div>
    <div className="lp-admin-audit-filters"><div className="lp-admin-field"><label htmlFor="audit-employee">Employee</label><PortalSelect id="audit-employee" label="Employee" searchable value={employee} options={[{ value: "all", label: "All employees" }, ...employees.map((item) => ({ value: item.uuid, label: item.full_name }))]} onValueChange={(value) => change(setEmployee, value)} /></div><div className="lp-admin-field"><label htmlFor="audit-application">Application</label><PortalSelect id="audit-application" label="Application" searchable value={application} options={[{ value: "all", label: "All applications" }, ...applications.map((item) => ({ value: item.uuid, label: item.name }))]} onValueChange={(value) => change(setApplication, value)} /></div><div className="lp-admin-field"><label htmlFor="audit-from">From date</label><PortalDatePicker id="audit-from" label="From date" value={from} max={to || undefined} onValueChange={(value) => change(setFrom, value)} /></div><div className="lp-admin-field"><label htmlFor="audit-to">To date</label><PortalDatePicker id="audit-to" label="To date" value={to} min={from || undefined} onValueChange={(value) => change(setTo, value)} /></div><Button variant="outline" onClick={() => void load()}><RefreshCw aria-hidden="true" />Refresh events</Button><Button variant="ghost" onClick={reset}>Reset filters</Button></div>
    {from && to && from > to && <p role="alert" className="lp-admin-error">Choose an end date on or after the start date.</p>}
    <div className="lp-admin-audit-date"><FileClock size={18} aria-hidden="true" />Recorded identity and access events</div>
    {error ? <PortalStatus kind="error" title="We couldn’t load audit events." action={<Button variant="outline" onClick={() => void load()}>Try again</Button>}>{error}</PortalStatus> : <div className="lp-admin-table"><Table><TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Event</TableHead><TableHead>Actor</TableHead><TableHead>Record</TableHead><TableHead className="text-right">Details</TableHead></TableRow></TableHeader><TableBody>
      {loading ? [1, 2, 3, 4].map((item) => <TableRow key={item}><TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell></TableRow>) : visible.length ? visible.map((log) => <TableRow key={log.id}><TableCell className="lp-admin-time">{dateTime(log.created_at)}</TableCell><TableCell><strong>{actionName(log.action)}</strong></TableCell><TableCell>{log.employee?.full_name || "System"}</TableCell><TableCell>{log.application?.name || "—"}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => setDetail(log)} aria-label={`View ${actionName(log.action).toLowerCase()} event at ${dateTime(log.created_at)}`}>View<ArrowRight aria-hidden="true" /></Button></TableCell></TableRow>) : <TableRow><TableCell colSpan={5}><div className="lp-admin-empty">No audit events match these filters.</div></TableCell></TableRow>}
    </TableBody></Table></div>}
    {!error && !loading && meta && <div className="lp-admin-pagination"><span>Showing {meta.from ?? 0}–{meta.to ?? 0} of {meta.total} events</span><div><PortalSelect label="Events per page" value={String(perPage)} options={[10, 25, 50, 100].map((value) => ({ value: String(value), label: `${value} per page` }))} onValueChange={(value) => { setPerPage(Number(value)); setPage(1); }} /><Button variant="outline" size="sm" onClick={() => setPage((old) => old - 1)} disabled={page <= 1}><ChevronLeft aria-hidden="true" />Previous</Button><span>Page {page} of {Math.max(1, meta.last_page)}</span><Button variant="outline" size="sm" onClick={() => setPage((old) => old + 1)} disabled={page >= meta.last_page}>Next<ChevronRight aria-hidden="true" /></Button></div></div>}
    <Dialog open={!!detail} onOpenChange={(open) => { if (!open) setDetail(null); }}><DialogContent><DialogHeader><DialogTitle>{detail && actionName(detail.action)}</DialogTitle><DialogDescription>{detail && dateTime(detail.created_at)}</DialogDescription></DialogHeader>{detail && <dl className="lp-admin-details"><dt>Actor</dt><dd>{detail.employee?.full_name || "System"}</dd><dt>Application</dt><dd>{detail.application?.name || "—"}</dd><dt>IP address</dt><dd>{detail.ip_address || "—"}</dd><dt>User agent</dt><dd>{detail.user_agent || "—"}</dd><dt>Metadata</dt><dd><pre className="lp-admin-metadata">{JSON.stringify(detail.metadata || {}, null, 2)}</pre></dd></dl>}</DialogContent></Dialog>
  </div>;
}
