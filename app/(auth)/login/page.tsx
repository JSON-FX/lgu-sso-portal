"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Lock, Loader2, AlertCircle } from "lucide-react";

import { toast } from "sonner";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(username, password);
      toast.success("Welcome back!");
      const { mustChangePassword, isSuperAdmin } = useAuth.getState();
      if (mustChangePassword) {
        router.push("/setup-account");
      } else if (isSuperAdmin) {
        router.push("/dashboard");
      } else {
        router.push("/portal");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-sidebar-primary/20 blur-3xl" />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-sidebar-primary/10 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-4 mb-8">
            <img src="/lgu-seal.png" alt="LGU Quezon" className="w-14 h-14" />
            <div>
              <h1 className="text-3xl font-bold text-sidebar-foreground">LGU-SSO</h1>
              <p className="text-sm font-medium text-sidebar-foreground/60 uppercase tracking-wider">
                Administration Portal
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-4xl font-bold text-sidebar-foreground leading-tight">
              Centralized Identity<br />
              <span className="text-sidebar-primary">Management System</span>
            </h2>
            <p className="text-lg text-sidebar-foreground/70 max-w-md">
              Secure single sign-on solution for Local Government Unit applications.
              Manage employees, applications, and access controls from one place.
            </p>
          </div>

        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <img src="/lgu-seal.png" alt="LGU Quezon" className="w-12 h-12 rounded-full" />
            <div>
              <h1 className="text-xl font-bold">LGU-SSO</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Admin Portal</p>
            </div>
          </div>

          <Card className="border-0 shadow-xl shadow-primary/5">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
              <CardDescription>
                Enter your credentials to continue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
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
                      disabled={isLoading}
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
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? (
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
                  Contact your SSO administrator to request an account.
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Local Government of Quezon Bukidnon. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
