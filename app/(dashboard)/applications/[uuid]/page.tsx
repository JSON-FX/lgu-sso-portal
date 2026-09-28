"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ApplicationForm, type ApplicationFormValues } from "@/components/portal/application-form";
import { PortalStatus } from "@/components/portal/design";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { Application } from "@/types";

export default function ApplicationDetailPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const router = useRouter();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<"rotate" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [secret, setSecret] = useState("");
  const [copied, setCopied] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setApplication((await api.applications.get(uuid)).data); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Application could not be loaded."); }
    finally { setLoading(false); }
  }, [uuid]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  const save = async (values: ApplicationFormValues) => { setApplication((await api.applications.update(uuid, values)).data); toast.success("Application saved."); };
  const act = async () => {
    if (!confirm) return;
    setBusy(true); setActionError("");
    try {
      if (confirm === "rotate") { setSecret((await api.applications.regenerateSecret(uuid)).data.client_secret); setCopied(false); setConfirm(null); }
      else { await api.applications.delete(uuid); router.push("/applications"); toast.success("Application deleted."); }
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "The action failed."); }
    finally { setBusy(false); }
  };
  const copy = async (value: string) => { await navigator.clipboard.writeText(value); toast.success("Copied to clipboard."); };

  return <div className="lp-admin">
    <Button variant="ghost" asChild className="lp-admin-back"><Link href="/applications"><ArrowLeft aria-hidden="true" />Applications</Link></Button>
    {loading ? <div aria-label="Loading application"><Skeleton className="h-12 w-80 mb-8" /><Skeleton className="h-80 w-full" /></div> : error || !application ? <PortalStatus kind="error" title="We couldn’t load this application." action={<Button variant="outline" onClick={() => void load()}>Try again</Button>}>{error || "The record is unavailable."}</PortalStatus> : <>
      <header className="lp-admin-heading"><div><p className="lp-admin-eyebrow">Client registration</p><h1>{application.name}</h1><p className="lp-admin-description">Keep client credentials private. Register only callbacks controlled by the application.</p></div><Button variant="outline" asChild><Link href={`/applications/${uuid}/employees`}>Manage employees<ArrowRight aria-hidden="true" /></Link></Button></header>
      <section className="lp-admin-section"><div className="lp-admin-section-heading"><h2>Client credentials</h2></div><div className="lp-admin-credential"><div><Label>Client ID</Label><code>{application.client_id}</code><Button size="sm" variant="outline" onClick={() => void copy(application.client_id)}><Copy aria-hidden="true" />Copy client ID</Button><p className="lp-admin-hint">The client secret is shown only when created or rotated.</p></div><Button variant="outline" onClick={() => setConfirm("rotate")}>Rotate secret</Button></div></section>
      <ApplicationForm key={uuid} initial={application} onSave={save} onCancel={() => router.push("/applications")} submitLabel="Save application" />
      <section className="lp-admin-section"><div className="lp-admin-section-heading"><h2>Delete application</h2><p>Deleting the client registration removes employee grants and ends application sessions.</p></div><Button variant="destructive" onClick={() => setConfirm("delete")}><Trash2 aria-hidden="true" />Delete application</Button></section>
      <Dialog open={!!confirm} onOpenChange={(open) => { if (!open && !busy) { setConfirm(null); setActionError(""); } }}><DialogContent><DialogHeader><DialogTitle>{confirm === "rotate" ? "Rotate this client secret?" : "Delete this application?"}</DialogTitle><DialogDescription>{confirm === "rotate" ? "The previous secret stops working. Existing application sessions and pending authorization codes are revoked. Update the application with the new secret." : "This permanently removes the client registration and its employee grants. Existing sessions end."}</DialogDescription></DialogHeader>{actionError && <PortalStatus kind="error" title="Action failed.">{actionError}</PortalStatus>}<DialogFooter><Button variant="outline" onClick={() => setConfirm(null)} disabled={busy}>Cancel</Button><Button variant={confirm === "delete" ? "destructive" : "default"} onClick={() => void act()} disabled={busy}>{busy ? "Working…" : confirm === "rotate" ? "Rotate secret" : "Delete application"}</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!secret} onOpenChange={() => { /* Keep the one-time secret visible until recorded. */ }}><DialogContent showCloseButton={false}><DialogHeader><DialogTitle>New client secret</DialogTitle><DialogDescription>Record this secret now. It will not be shown again.</DialogDescription></DialogHeader><code className="lp-admin-secret-value">{secret}</code><DialogFooter><Button variant="outline" onClick={() => { void copy(secret).then(() => setCopied(true)); }}><Copy aria-hidden="true" />{copied ? "Copied" : "Copy secret"}</Button><Button onClick={() => setSecret("")}>I’ve recorded it</Button></DialogFooter></DialogContent></Dialog>
    </>}
  </div>;
}
