"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { PasswordInput, PortalHeading, PortalStatus } from "@/components/portal/design";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function ChangePasswordPage() {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const meetsRules = next.length >= 6 && /\d/.test(next);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    if (next !== confirm) { setStatus({ kind: "error", message: "Your new passwords do not match." }); return; }
    if (!current || !meetsRules) { setStatus({ kind: "error", message: "Use at least 6 characters, including a number." }); return; }
    setSaving(true);
    try {
      await changePassword(current, next);
      setCurrent(""); setNext(""); setConfirm("");
      setStatus({ kind: "success", message: "Your password has been updated." });
    } catch (cause) {
      setStatus({ kind: "error", message: cause instanceof Error ? cause.message : "We couldn’t update your password. Try again." });
    } finally { setSaving(false); }
  };

  return <>
    <PortalHeading eyebrow="My account" title="Change password">Choose a password you don’t use for other accounts.</PortalHeading>
    <form className="lp-password-form" onSubmit={submit}>
      <PasswordInput id="current-password" label="Current password" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} disabled={saving} required />
      <PasswordInput id="new-password" label="New password" autoComplete="new-password" value={next} onChange={(event) => setNext(event.target.value)} disabled={saving} minLength={6} required />
      <p className="lp-muted">Use at least 6 characters, including a number.</p>
      <PasswordInput id="confirm-password" label="Confirm new password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} disabled={saving} required />
      {status && <PortalStatus kind={status.kind} title={status.message} />}
      <Button type="submit" disabled={saving || !current || !meetsRules || !confirm}>{saving && <Loader2 className="size-4 animate-spin" />}Update password</Button>
    </form>
  </>;
}
