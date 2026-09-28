"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppWindow, ArrowRight, Search, ShieldCheck } from "lucide-react";
import { portalApi } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import type { EmployeeApplication } from "@/types/employee";
import { PortalHeading, PortalStatus } from "@/components/portal/design";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

const roleLabel = (role: EmployeeApplication["role"]) => role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function PortalApplicationsPage() {
  const [applications, setApplications] = useState<EmployeeApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<EmployeeApplication | null>(null);
  const { user } = useAuth();

  const loadApplications = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setApplications(await portalApi.getApplications());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn’t load your applications.");
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => { void loadApplications(); }, [loadApplications]);

  const filtered = useMemo(() => applications.filter((app) => `${app.name} ${app.role}`.toLowerCase().includes(query.trim().toLowerCase())), [applications, query]);

  return <>
    <PortalHeading eyebrow="Employee workspace" title="Your work starts here.">Find the applications available to your account.</PortalHeading>
    {isLoading ? (
      <div role="status" aria-label="Loading your applications" className="space-y-4">
        <Skeleton className="h-10 w-48" />
        {[1, 2, 3].map((item) => <Skeleton key={item} className="h-28 w-full" />)}
      </div>
    ) : error ? (
      <PortalStatus kind="error" title="We couldn’t load your applications." action={<Button variant="outline" onClick={() => void loadApplications()}>Try again</Button>}>
        Your permissions have not changed. {error}
      </PortalStatus>
    ) : <>
      <div className="lp-directory-tools">
        <div><h2>My applications <span>{String(applications.length).padStart(2, "0")}</span></h2><p>Access assigned by your administrator</p></div>
        <div className="lp-search"><Search size={18} aria-hidden="true" /><Input aria-label="Find an application" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find an application" /></div>
      </div>
      {filtered.length ? (
        <div className="lp-app-list">
          {filtered.map((app) => <article className="lp-app-row" key={app.uuid}>
            <span className="lp-app-icon"><AppWindow size={24} aria-hidden="true" /></span>
            <div className="lp-app-copy"><h3>{app.name}</h3><p>Available to your LGU account</p></div>
            <Badge variant="secondary">{roleLabel(app.role)}</Badge>
            <Button variant="ghost" onClick={() => setSelected(app)}>View access <ArrowRight size={17} /></Button>
          </article>)}
        </div>
      ) : (
        <PortalStatus kind="empty" title={query ? "No applications match your search." : "No applications assigned yet."} action={query ? <Button variant="outline" onClick={() => setQuery("")}>Clear search</Button> : undefined}>
          {query ? "Try a different application name." : "Your administrator can assign the tools you need for your work."}
        </PortalStatus>
      )}
      <div className="lp-access-note"><ShieldCheck size={20} aria-hidden="true" /><p><strong>One identity across your applications.</strong><br />Your assigned role controls what you can access. Contact your administrator if something is missing.</p></div>
    </>}
    <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
      <SheetContent>
        <SheetHeader><SheetTitle>{selected?.name}</SheetTitle><SheetDescription>Application access details</SheetDescription></SheetHeader>
        <div className="lp-sheet-body">
          <Badge>Access assigned</Badge>
          <dl><dt>Your role</dt><dd>{selected && roleLabel(selected.role)}</dd><dt>Account</dt><dd>{user?.username || "Your LGU account"}</dd></dl>
          <PortalStatus title="Use your LGU account to sign in.">Open this application using the address provided by your office.</PortalStatus>
        </div>
      </SheetContent>
    </Sheet>
  </>;
}
