"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { PortalStatus } from "@/components/portal/design";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, mustChangePassword, setupCompleted, authError, checkAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isLoading || authError) return;

    if (!isAuthenticated) {
      const params = new URLSearchParams(window.location.search);
      const clientId = params.get("client_id");
      const redirectUri = params.get("redirect_uri");
      const state = params.get("state");

      if (clientId && redirectUri && state) {
        router.push(`/sso/login?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`);
      } else {
        router.push("/login");
      }
      return;
    }

    if (!mustChangePassword && !setupCompleted) {
      const params = new URLSearchParams(window.location.search);
      const clientId = params.get("client_id");
      const redirectUri = params.get("redirect_uri");
      const state = params.get("state");

      if (clientId && redirectUri && state) {
        window.location.href = `/sso/login?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
      } else {
        router.push("/portal/applications");
      }
    }
  }, [isLoading, isAuthenticated, mustChangePassword, setupCompleted, authError, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return <div className="mx-auto flex min-h-screen max-w-lg items-center px-6">
      <PortalStatus kind="error" title="Sign-in service is temporarily unavailable." action={<Button variant="outline" onClick={() => void checkAuth()}>Try again</Button>}>
        Your account setup can continue when the service is available.
      </PortalStatus>
    </div>;
  }

  if (!isAuthenticated || (!mustChangePassword && !setupCompleted)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
