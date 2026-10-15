"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRetryCooldown } from "@/hooks/use-retry-cooldown";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api";
import { AuthShell, PasswordInput, PortalStatus } from "@/components/portal/design";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const cooldown = useRetryCooldown();
  const submitting = useRef(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting.current || cooldown.isCoolingDown()) return;
    submitting.current = true;
    setError("");
    setIsLoading(true);
    try {
      await login(username, password);
      toast.success("Welcome back!");
      const { mustChangePassword } = useAuth.getState();
      router.replace(mustChangePassword ? "/setup-account" : "/portal/applications");
    } catch (cause) {
      cooldown.start(cause);
      setError(cause instanceof ApiError || cause instanceof Error ? cause.message : "An unexpected error occurred");
    } finally {
      submitting.current = false;
      setIsLoading(false);
    }
  };

  return (
    <AuthShell eyebrow="Welcome back" title="Sign in to your account.">
      <form onSubmit={handleSubmit}>
        {error && <PortalStatus kind="error" title="Sign-in failed.">{error}</PortalStatus>}
        <div className="lp-field">
          <Label htmlFor="username">Username</Label>
          <Input id="username" name="username" autoComplete="username" placeholder="Enter your username" value={username} onChange={(event) => setUsername(event.target.value)} required disabled={isLoading} aria-invalid={!!error} />
        </div>
        <PasswordInput id="password" label="Password" name="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={isLoading} aria-invalid={!!error} />
        <p className="lp-muted">Use your generated username, not your email address.</p>
        {cooldown.seconds > 0 && <p className="lp-muted" role="timer" aria-live="off">Try again in {cooldown.seconds} seconds. Your entries are kept.</p>}
        <Button className="lp-submit" type="submit" disabled={isLoading || cooldown.seconds > 0}>
          {isLoading ? <><Loader2 className="animate-spin" /> Signing in…</> : <>Sign in <ArrowRight /></>}
        </Button>
      </form>
      <p className="lp-registration-signin">New to LGU Portal? <Link href="/register">Create an account</Link></p>
    </AuthShell>
  );
}
