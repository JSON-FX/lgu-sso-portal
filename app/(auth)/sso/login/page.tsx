"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { User, Lock, Loader2, AlertCircle } from "lucide-react";

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
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - SSO Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-sidebar-primary/20 blur-3xl" />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-sidebar-primary/10 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-4 mb-8">
            <img src="/lgu-seal.png" alt="LGU Quezon" className="w-14 h-14" />
            <div>
              <h1 className="text-3xl font-bold text-sidebar-foreground">
                LGU-SSO
              </h1>
              <p className="text-sm font-medium text-sidebar-foreground/60 uppercase tracking-wider">
                Single Sign-On
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-4xl font-bold text-sidebar-foreground leading-tight">
              Secure
              <br />
              <span className="text-sidebar-primary">Authentication</span>
            </h2>
            <p className="text-lg text-sidebar-foreground/70 max-w-md">
              You are being signed in through the LGU Single Sign-On system.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form / Status */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <img src="/lgu-seal.png" alt="LGU Quezon" className="w-12 h-12 rounded-full" />
            <div>
              <h1 className="text-xl font-bold">LGU-SSO</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Single Sign-On
              </p>
            </div>
          </div>

          {/* Loading / Checking Session States */}
          {(validation.status === "loading" ||
            validation.status === "checking-session") && (
            <Card className="border-0 shadow-xl shadow-primary/5">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">
                  {validation.status === "checking-session"
                    ? "Checking existing session..."
                    : "Validating your request..."}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Missing Params State */}
          {validation.status === "missing-params" && (
            <Card className="border-0 shadow-xl shadow-primary/5">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Invalid Request
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  Required parameters are missing. Please return to the
                  application and try again.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {validation.status === "error" && (
            <Card className="border-0 shadow-xl shadow-primary/5">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Validation Failed
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  {validation.message}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Login Form State */}
          {validation.status === "validated" && (
            <Card className="border-0 shadow-xl shadow-primary/5">
              <CardHeader className="space-y-1 pb-6">
                <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
                <CardDescription>
                  Sign in to access{" "}
                  <span className="font-semibold text-foreground">
                    {validation.applicationName}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  {loginError && (
                    <div
                      role="alert"
                      className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium">
                      Username
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="username"
                        type="text"
                        placeholder="e.g., j.doe"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-10 h-11"
                        required
                        disabled={isSubmitting}
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 h-11"
                        required
                        disabled={isSubmitting}
                        autoComplete="current-password"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 text-base font-semibold"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                  <p>
                    You will be redirected back to{" "}
                    <span className="font-medium text-foreground">
                      {validation.applicationName}
                    </span>{" "}
                    after signing in.
                  </p>
                </div>

                <p className="text-sm text-muted-foreground text-center mt-4">
                  Contact your SSO administrator to request an account.
                </p>
              </CardContent>
            </Card>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Local Government of Quezon Bukidnon. All rights
            reserved.
          </p>
        </div>
      </div>
    </div>
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
