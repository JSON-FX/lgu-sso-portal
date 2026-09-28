"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell, PasswordInput, PortalStatus } from "@/components/portal/design";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, FileText, Loader2 } from "lucide-react";

import { toast } from "sonner";
import { ssoApi } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";

type ValidationState =
  | { status: "loading" }
  | { status: "missing-params" }
  | { status: "error"; message: string }
  | { status: "checking-session"; applicationName: string }
  | { status: "validated"; applicationName: string };

function SSOLoginContent() {
  const searchParams = useSearchParams();
  const redirectUri = searchParams.get("redirect_uri");
  const clientId = searchParams.get("client_id");
  const state = searchParams.get("state");

  const [validation, setValidation] = useState<ValidationState>({
    status: "loading",
  });
  const { login: authLogin } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState("");

  const redirectWithCode = useCallback(async () => {
    const { code } = await ssoApi.issueCode({ client_id: clientId!, redirect_uri: redirectUri! });
    const destination = new URL(redirectUri!);
    destination.searchParams.set("code", code);
    destination.searchParams.set("state", state!);
    window.location.assign(destination.toString());
  }, [clientId, redirectUri, state]);

  const validateRedirect = useCallback(async () => {
    if (!redirectUri || !clientId || !state) {
      setValidation({ status: "missing-params" });
      return;
    }

    try {
      const data = await ssoApi.validateRedirect({
        client_id: clientId,
        redirect_uri: redirectUri,
      });

      const applicationName = "application_name" in data
        ? data.application_name
        : data.application?.name || "the application";

      setValidation({ status: "checking-session", applicationName });

      const sessionData = await ssoApi.sessionCheck();
      if (sessionData.authenticated) {
        if ("must_change_password" in sessionData && sessionData.must_change_password) {
          window.location.assign(`/setup-account?${new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, state })}`);
          return;
        }
        await redirectWithCode();
        return;
      }

      setValidation({ status: "validated", applicationName });
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "The redirect request could not be validated.";
      setValidation({
        status: "error",
        message,
      });
    }
  }, [redirectUri, clientId, state, redirectWithCode]);

  useEffect(() => {
    validateRedirect();
  }, [validateRedirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsSubmitting(true);

    try {
      // Use useAuth login to populate Zustand store (needed for setup-account)
      await authLogin(username, password);
      const { mustChangePassword } = useAuth.getState();

      // Check if user must change password before proceeding
      if (mustChangePassword) {
        window.location.href = `/setup-account?client_id=${encodeURIComponent(clientId!)}&redirect_uri=${encodeURIComponent(redirectUri!)}&state=${encodeURIComponent(state!)}`;
        return;
      }

      toast.success("Authentication successful. Redirecting...");

      await redirectWithCode();
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Invalid username or password. Please try again.";
      setLoginError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell eyebrow="Application sign-in" title="Sign in to your account.">
      {(validation.status === "loading" || validation.status === "checking-session") && (
        <div role="status" className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          {validation.status === "checking-session" ? "Checking your session…" : "Validating the sign-in request…"}
        </div>
      )}
      {validation.status === "missing-params" && (
        <PortalStatus kind="error" title="This sign-in request is not valid.">
          Return to the application and start sign-in again. Do not continue from an unrecognized link.
        </PortalStatus>
      )}
      {validation.status === "error" && (
        <PortalStatus kind="error" title="We couldn’t validate this sign-in request." action={
          <Button variant="outline" onClick={() => void validateRedirect()}>Try again</Button>
        }>{validation.message}</PortalStatus>
      )}
      {validation.status === "validated" && (
        <>
          <div className="lp-requesting-app">
            <FileText size={23} aria-hidden="true" />
            <div><small>You’re signing in to</small><strong>{validation.applicationName}</strong></div>
          </div>
          <form onSubmit={handleSubmit}>
            {loginError && <PortalStatus kind="error" title="Sign-in failed.">{loginError}</PortalStatus>}
            <div className="lp-field">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" autoComplete="username" placeholder="Enter your username" value={username} onChange={(event) => setUsername(event.target.value)} required disabled={isSubmitting} aria-invalid={!!loginError} />
            </div>
            <PasswordInput id="password" label="Password" name="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={isSubmitting} aria-invalid={!!loginError} />
            <Button className="lp-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="animate-spin" /> Signing in…</> : <>Sign in and continue <ArrowRight /></>}
            </Button>
          </form>
          <p className="lp-muted mt-5">After sign-in, you’ll return to {validation.applicationName}.</p>
        </>
      )}
    </AuthShell>
  );
}

export default function SSOLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <SSOLoginContent />
    </Suspense>
  );
}
