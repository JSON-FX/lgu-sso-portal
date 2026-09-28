"use client";

import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, Circle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AuthShell, PasswordInput, PortalStatus } from "@/components/portal/design";
import { Button } from "@/components/ui/button";

type Stage = "welcome" | "password" | "done";

function SetupAccountContent() {
  const [stage, setStage] = useState<Stage>("welcome");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { user, changePassword } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const minLength = newPassword.length >= 6;
  const hasNumber = /\d/.test(newPassword);
  const passwordsMatch = !!confirmPassword && newPassword === confirmPassword;

  const handleSetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!minLength || !hasNumber || !passwordsMatch) {
      setError("Use at least 6 characters, include a number, and confirm your new password.");
      return;
    }
    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setStage("done");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn’t change your password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDoneContinue = useCallback(() => {
    const clientId = searchParams.get("client_id");
    const redirectUri = searchParams.get("redirect_uri");
    const state = searchParams.get("state");
    if (clientId && redirectUri && state) {
      window.location.assign(`/sso/login?${new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, state })}`);
      return;
    }
    router.replace("/portal/applications");
  }, [router, searchParams]);

  const title = stage === "welcome" ? "Welcome to LGU Portal." : stage === "password" ? "Create your password." : "You’re ready to begin.";
  return (
    <AuthShell eyebrow="Account setup" title={title}>
      {stage === "welcome" && (
        <div className="space-y-6">
          <p className="text-muted-foreground">
            {user?.first_name ? `${user.first_name}, your` : "Your"} administrator created your account. Set a personal password before using connected services.
          </p>
          <Button onClick={() => setStage("password")} className="lp-submit">Set up my account <ArrowRight /></Button>
        </div>
      )}
      {stage === "password" && (
        <form onSubmit={handleSetPassword}>
          <PasswordInput id="current-password" label="Temporary password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required disabled={isSubmitting} />
          <PasswordInput id="new-password" label="New password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required disabled={isSubmitting} minLength={6} />
          <div className="space-y-2" aria-live="polite">
            <Requirement met={minLength}>At least 6 characters</Requirement>
            <Requirement met={hasNumber}>Contains a number</Requirement>
          </div>
          <PasswordInput id="confirm-password" label="Confirm new password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required disabled={isSubmitting} />
          {!!confirmPassword && <Requirement met={passwordsMatch}>Passwords match</Requirement>}
          {error && <PortalStatus kind="error" title="Password not updated.">{error}</PortalStatus>}
          <Button className="lp-submit" type="submit" disabled={isSubmitting || !currentPassword || !minLength || !hasNumber || !passwordsMatch}>
            {isSubmitting ? <><Loader2 className="animate-spin" /> Saving…</> : <>Save password <ArrowRight /></>}
          </Button>
        </form>
      )}
      {stage === "done" && (
        <div className="space-y-5">
          <PortalStatus kind="success" title="Password updated.">Your account is ready. Continue to your applications.</PortalStatus>
          <Button className="lp-submit" onClick={handleDoneContinue}>
            {searchParams.has("client_id") ? "Continue sign-in" : "Go to my applications"} <ArrowRight />
          </Button>
        </div>
      )}
    </AuthShell>
  );
}

function Requirement({ met, children }: { met: boolean; children: React.ReactNode }) {
  return <p className={`flex items-center gap-2 text-sm ${met ? "text-primary" : "text-muted-foreground"}`}>
    {met ? <Check className="size-4" aria-hidden="true" /> : <Circle className="size-4" aria-hidden="true" />}{children}
  </p>;
}

export default function SetupAccountPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin" aria-label="Loading account setup" /></div>}><SetupAccountContent /></Suspense>;
}
