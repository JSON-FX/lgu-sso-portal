"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Copy } from "lucide-react";
import { ApplicationForm, type ApplicationFormValues } from "@/components/portal/application-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import type { ApplicationWithSecret } from "@/types";

export default function NewApplicationPage() {
  const router = useRouter();
  const [created, setCreated] = useState<ApplicationWithSecret | null>(null);
  const [copied, setCopied] = useState(false);
  const save = async (values: ApplicationFormValues) => { setCreated((await api.applications.create(values)).data); };
  const copy = async () => { if (!created) return; await navigator.clipboard.writeText(`Client ID: ${created.client_id}\nClient secret: ${created.client_secret}`); setCopied(true); };
  return <div className="lp-admin">
    <Button variant="ghost" asChild className="lp-admin-back"><Link href="/applications"><ArrowLeft aria-hidden="true" />Applications</Link></Button>
    <header className="lp-admin-heading"><div><p className="lp-admin-eyebrow">Client registration</p><h1>Register an application</h1><p className="lp-admin-description">Keep client credentials private. Register only callbacks controlled by the application.</p></div></header>
    <ApplicationForm onSave={save} onCancel={() => router.push("/applications")} submitLabel="Register application" />
    <Dialog open={!!created} onOpenChange={() => { /* Keep the one-time secret visible until the administrator continues. */ }}><DialogContent showCloseButton={false}><DialogHeader><DialogTitle>Application registered</DialogTitle><DialogDescription>Record this client secret now. It will not be shown again.</DialogDescription></DialogHeader><dl className="lp-admin-credentials"><div><dt>Client ID</dt><dd><code>{created?.client_id}</code></dd></div><div><dt>Client secret</dt><dd><code>{created?.client_secret}</code></dd></div></dl><DialogFooter><Button variant="outline" onClick={() => void copy()}><Copy aria-hidden="true" />{copied ? "Copied" : "Copy credentials"}</Button><Button onClick={() => router.push(`/applications/${created?.uuid}`)}>Continue<ArrowRight aria-hidden="true" /></Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
