"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus, Search } from "lucide-react";
import { PortalStatus } from "@/components/portal/design";
import { PortalSelect } from "@/components/portal/selection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import type { Application } from "@/types";

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setApplications((await api.applications.list()).data); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Applications could not be loaded."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  const filtered = applications.filter((app) => `${app.name} ${app.description || ""}`.toLowerCase().includes(query.toLowerCase()) && (status === "all" || app.is_active === (status === "active")));

  return <div className="lp-admin">
    <header className="lp-admin-heading"><div><p className="lp-admin-eyebrow">Connected services</p><h1>Applications</h1><p className="lp-admin-description">Register trusted clients and manage who can access each application.</p></div><Button asChild><Link href="/applications/new"><Plus aria-hidden="true" />Register application</Link></Button></header>
    <div className="lp-admin-toolbar"><div className="lp-admin-search"><Search size={18} aria-hidden="true" /><Input aria-label="Search applications" placeholder="Search applications" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="lp-admin-filter"><PortalSelect label="Application status" value={status} options={[{ value: "all", label: "All statuses" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} onValueChange={setStatus} /></div><span className="lp-admin-hint">{filtered.length} {filtered.length === 1 ? "record" : "records"}</span></div>
    {error ? <PortalStatus kind="error" title="We couldn’t load applications." action={<Button variant="outline" onClick={() => void load()}>Try again</Button>}>{error}</PortalStatus> : <div className="lp-admin-table"><Table><TableHeader><TableRow><TableHead>Application</TableHead><TableHead>Status</TableHead><TableHead>Request limit</TableHead><TableHead className="text-right">Manage</TableHead></TableRow></TableHeader><TableBody>
      {loading ? [1, 2, 3].map((item) => <TableRow key={item}><TableCell colSpan={4}><Skeleton className="h-10 w-full" /></TableCell></TableRow>) : filtered.length ? filtered.map((app) => <TableRow key={app.uuid}><TableCell><strong>{app.name}</strong><small>{app.description || "No description"}</small></TableCell><TableCell><Badge variant={app.is_active ? "secondary" : "outline"}>{app.is_active ? "Active" : "Inactive"}</Badge></TableCell><TableCell>{app.rate_limit_per_minute} / minute</TableCell><TableCell className="text-right"><div className="lp-admin-row-actions"><Button variant="ghost" size="sm" asChild><Link href={`/applications/${app.uuid}`} aria-label={`Configure ${app.name}`}>Configure</Link></Button><Button variant="outline" size="sm" asChild><Link href={`/applications/${app.uuid}/employees`} aria-label={`Manage employees for ${app.name}`}>Employees<ArrowRight aria-hidden="true" /></Link></Button></div></TableCell></TableRow>) : <TableRow><TableCell colSpan={4}><div className="lp-admin-empty">{query || status !== "all" ? "No applications match these filters." : "No applications registered. Register an application to begin."}</div></TableCell></TableRow>}
    </TableBody></Table></div>}
  </div>;
}
