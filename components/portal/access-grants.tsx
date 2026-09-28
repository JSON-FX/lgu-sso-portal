"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { PortalStatus } from "@/components/portal/design";
import { PortalSelect } from "@/components/portal/selection";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Role } from "@/types";

export type AccessRow = { id: string; name: string; role: Role };
export type AccessOption = { id: string; name: string };
const roles: { value: Role; label: string }[] = [
  { value: "guest", label: "Guest" }, { value: "standard", label: "Standard" },
  { value: "administrator", label: "Administrator" }, { value: "super_administrator", label: "Super administrator" },
];
const roleName = (role: Role) => roles.find((item) => item.value === role)?.label || role;

export function AccessGrants({ subject, assigned, available, onGrant, onChange, onRevoke }: {
  subject: "Application" | "Employee";
  assigned: AccessRow[];
  available: AccessOption[];
  onGrant: (id: string, role: Role) => Promise<void>;
  onChange: (id: string, role: Role) => Promise<void>;
  onRevoke: (id: string) => Promise<void>;
}) {
  const [target, setTarget] = useState("");
  const [role, setRole] = useState<Role>("standard");
  const [confirm, setConfirm] = useState<{ title: string; description: string; label: string; action: () => Promise<void>; destructive?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const apply = async () => {
    if (!confirm) return;
    setBusy(true); setError("");
    try { await confirm.action(); setConfirm(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The access change failed."); }
    finally { setBusy(false); }
  };
  const grant = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const item = available.find((option) => option.id === target);
    if (!item) return;
    setConfirm({ title: "Grant application access?", description: `${item.name} will receive the ${roleName(role).toLowerCase()} role.`, label: "Grant access", action: async () => { await onGrant(item.id, role); setTarget(""); } });
  };
  return <>
    <section className="lp-admin-section"><div className="lp-admin-section-heading"><h2>Current access</h2><p>Shared roles define application access. Each application manages its detailed business permissions.</p></div><div className="lp-admin-table"><Table><TableHeader><TableRow><TableHead>{subject}</TableHead><TableHead>Shared role</TableHead><TableHead className="text-right">Access</TableHead></TableRow></TableHeader><TableBody>
      {assigned.length ? assigned.map((item) => <TableRow key={item.id}><TableCell><strong>{item.name}</strong></TableCell><TableCell><div className="lp-admin-role"><PortalSelect label={`Role for ${item.name}`} value={item.role} options={roles} onValueChange={(next) => setConfirm({ title: "Change this role?", description: `${item.name} will have the ${roleName(next as Role).toLowerCase()} role. This changes the permissions the application receives.`, label: "Change role", action: () => onChange(item.id, next as Role) })} /></div></TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => setConfirm({ title: "Revoke application access?", description: `${item.name} will lose this grant. Existing application sessions are revoked when the change is applied.`, label: "Revoke access", action: () => onRevoke(item.id), destructive: true })}>Revoke</Button></TableCell></TableRow>) : <TableRow><TableCell colSpan={3}><div className="lp-admin-empty">No application access has been granted.</div></TableCell></TableRow>}
    </TableBody></Table></div></section>
    <section className="lp-admin-section"><div className="lp-admin-section-heading"><h2>Grant access</h2><p>Choose the minimum role needed for the employee’s work.</p></div><form className="lp-admin-grant-form" onSubmit={grant}><div className="lp-admin-field"><label htmlFor="grant-target">{subject}</label><PortalSelect id="grant-target" label={subject} searchable value={target} options={available.map((item) => ({ value: item.id, label: item.name }))} placeholder={`Choose ${subject.toLowerCase()}`} disabled={!available.length} onValueChange={setTarget} /></div><div className="lp-admin-field"><label htmlFor="grant-role">Shared role</label><PortalSelect id="grant-role" label="Shared role" value={role} options={roles} onValueChange={(value) => setRole(value as Role)} /></div><Button type="submit" disabled={!target}><Plus aria-hidden="true" />Grant access</Button></form>{!available.length && <p className="lp-admin-hint">All available {subject.toLowerCase()}s already have a grant.</p>}</section>
    <Dialog open={!!confirm} onOpenChange={(open) => { if (!open && !busy) { setConfirm(null); setError(""); } }}><DialogContent><DialogHeader><DialogTitle>{confirm?.title}</DialogTitle><DialogDescription>{confirm?.description}</DialogDescription></DialogHeader>{error && <PortalStatus kind="error" title="Access change failed.">{error}</PortalStatus>}<DialogFooter><Button variant="outline" onClick={() => setConfirm(null)} disabled={busy}>Cancel</Button><Button variant={confirm?.destructive ? "destructive" : "default"} onClick={() => void apply()} disabled={busy}>{busy ? "Saving…" : confirm?.label}</Button></DialogFooter></DialogContent></Dialog>
  </>;
}
