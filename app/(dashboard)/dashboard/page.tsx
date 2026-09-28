"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, KeyRound, Plus, ShieldCheck, Users } from "lucide-react";
import { PortalStatus } from "@/components/portal/design";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import type { AuditLog } from "@/types";

type Stats = Awaited<ReturnType<typeof api.stats.getDashboardStats>>;
const actionLabel: Record<AuditLog["action"], string> = {
  login: "Signed in", logout: "Signed out", logout_all: "Signed out everywhere",
  token_refresh: "Session refreshed", token_validate: "Session validated", app_authorize: "Application authorized",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const [activityError, setActivityError] = useState(false);
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setStatsError(false); setActivityError(false);
    const [counts, logs] = await Promise.allSettled([api.stats.getDashboardStats(), api.audit.list({ per_page: 5 })]);
    if (counts.status === "fulfilled") setStats(counts.value); else { setStats(null); setStatsError(true); }
    if (logs.status === "fulfilled") setActivity(logs.value.data); else { setActivity([]); setActivityError(true); }
    setLoading(false);
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  return <div className="lp-admin">
    <header className="lp-admin-heading"><div><p className="lp-admin-eyebrow">Administration</p><h1>A clear view of access.</h1><p className="lp-admin-description">Manage the people and applications connected to LGU identity.</p></div></header>
    {loading ? <div role="status" aria-label="Loading administration overview" className="lp-admin-summary">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-20 flex-1" />)}</div> : statsError ? <PortalStatus kind="error" title="Overview numbers are unavailable." action={<Button variant="outline" onClick={() => void load()}>Try again</Button>}>Employee and application records are still available from their pages.</PortalStatus> : <div className="lp-admin-summary">
      <div><Users aria-hidden="true" /><strong>{stats?.totalEmployees.toLocaleString()}</strong><span>employees · {stats?.activeEmployees} active</span></div>
      <div><KeyRound aria-hidden="true" /><strong>{stats?.totalApplications.toLocaleString()}</strong><span>registered applications · {stats?.activeApplications} active</span></div>
      <div><ShieldCheck aria-hidden="true" /><strong>{stats?.recentLogins.toLocaleString()}</strong><span>sign-ins in the last 7 days</span></div>
    </div>}
    <div className="lp-admin-quick">
      <Button variant="outline" asChild><Link href="/employees/new"><Plus aria-hidden="true" />Add employee</Link></Button>
      <Button variant="outline" asChild><Link href="/applications/new"><Plus aria-hidden="true" />Register application</Link></Button>
      <Button variant="ghost" asChild><Link href="/employees">Review employee access<ArrowRight aria-hidden="true" /></Link></Button>
    </div>
    <section className="lp-admin-section" aria-labelledby="recent-activity"><div className="lp-admin-section-heading"><h2 id="recent-activity">Recent activity</h2><p>Latest identity and access events.</p></div>
      {loading ? <div role="status" aria-label="Loading recent activity" className="space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-16 w-full" />)}</div> : activityError ? <PortalStatus kind="error" title="Recent activity is unavailable." action={<Button variant="outline" onClick={() => void load()}>Try again</Button>} /> : activity.length ? <div className="lp-admin-table"><Table><TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Event</TableHead><TableHead>Actor</TableHead><TableHead className="text-right">Details</TableHead></TableRow></TableHeader><TableBody>{activity.map((log) => <TableRow key={log.id}><TableCell><time dateTime={log.created_at}>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</time></TableCell><TableCell><strong>{actionLabel[log.action]}</strong><small>{log.application?.name || "LGU Portal"}</small></TableCell><TableCell>{log.employee?.full_name || "System"}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => setSelected(log)} aria-label={`View ${actionLabel[log.action].toLowerCase()} event`}>View<ArrowRight aria-hidden="true" /></Button></TableCell></TableRow>)}</TableBody></Table></div> : <PortalStatus kind="empty" title="No recent activity.">Authentication events will appear here as they occur.</PortalStatus>}
      <Button variant="ghost" asChild><Link href="/audit">Open audit log<ArrowRight aria-hidden="true" /></Link></Button>
    </section>
    <div className="lp-admin-note"><ShieldCheck aria-hidden="true" /><p><strong>Access follows the employee.</strong><br />Deactivating an employee ends their sessions. Removing an application grant ends access to that application.</p></div>
    <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}><DialogContent><DialogHeader><DialogTitle>{selected ? actionLabel[selected.action] : "Event"}</DialogTitle><DialogDescription>Recorded authentication activity</DialogDescription></DialogHeader>{selected && <dl className="lp-admin-details"><dt>Employee</dt><dd>{selected.employee?.full_name || "System"}</dd><dt>Application</dt><dd>{selected.application?.name || "LGU Portal"}</dd><dt>Time</dt><dd>{new Date(selected.created_at).toLocaleString()}</dd><dt>IP address</dt><dd>{selected.ip_address || "Unavailable"}</dd></dl>}</DialogContent></Dialog>
  </div>;
}
