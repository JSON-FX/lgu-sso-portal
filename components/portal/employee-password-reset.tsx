"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Copy, KeyRound } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import type { Employee } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PortalStatus } from "@/components/portal/design";

export function EmployeePasswordReset({ employee, onReset }: { employee: Employee; onReset: () => void }) {
  const user = useAuth((state) => state.user);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);
  const [error, setError] = useState("");
  const [copyError, setCopyError] = useState("");
  const [copied, setCopied] = useState(false);

  function close() {
    if (submitting.current) return;
    setOpen(false);
    setCredentials(null);
    setError("");
    setCopyError("");
    setCopied(false);
  }

  async function reset() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api.employees.resetPassword(employee.uuid);
      setCredentials({ username: result.data.username, password: result.temporary_password });
      onReset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The reset could not be confirmed. Try again to generate a new temporary password.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function copy() {
    if (!credentials) return;
    setCopyError("");
    try {
      await navigator.clipboard.writeText(`Username: ${credentials.username}\nTemporary password: ${credentials.password}`);
      setCopied(true);
    } catch {
      setCopyError("Couldn’t copy. Select and copy the credentials below.");
    }
  }

  return <section className="lp-admin-section">
    <div className="lp-admin-section-heading"><h2>Password recovery</h2><p>Generate a temporary password if this employee cannot sign in. They must choose a new password before using their applications.</p></div>
    {user?.uuid === employee.uuid ? <Button variant="outline" asChild><Link href="/portal/change-password">Change my password</Link></Button> : <Button variant="outline" onClick={() => setOpen(true)}><KeyRound aria-hidden="true" />Reset password</Button>}
    <Dialog open={open} onOpenChange={(next) => { if (!next && !credentials) close(); }}>
      <DialogContent showCloseButton={!credentials && !busy}>
        <DialogHeader>
          <DialogTitle>{credentials ? "Temporary password ready" : `Reset password for ${employee.full_name}?`}</DialogTitle>
          <DialogDescription>{credentials ? "Share these credentials privately with the employee. This password is shown only now. They must replace it at their next sign-in." : "Their current password will stop working and all sessions will end, including connected applications. Their profile and application access stay the same."}</DialogDescription>
        </DialogHeader>
        {!employee.is_active && <p className="text-sm text-muted-foreground">This account is inactive. Resetting its password will not reactivate it.</p>}
        {credentials && <dl className="lp-admin-credentials"><div><dt>Username</dt><dd><code>{credentials.username}</code></dd></div><div><dt>Temporary password</dt><dd><code className="break-all select-all">{credentials.password}</code></dd></div></dl>}
        {error && <PortalStatus kind="error" title="Reset not confirmed.">{error} If the response was interrupted, generate another temporary password before sharing it.</PortalStatus>}
        {copyError && <p role="alert" className="text-sm text-destructive">{copyError}</p>}
        <DialogFooter>
          {credentials ? <><Button variant="outline" onClick={() => void copy()}><Copy aria-hidden="true" />{copied ? "Copied" : "Copy credentials"}</Button><Button onClick={close}>Done</Button></> : <><Button variant="outline" disabled={busy} onClick={close}>Cancel</Button><Button disabled={busy} onClick={() => void reset()}>{busy ? "Generating…" : "Generate temporary password"}</Button></>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>;
}
