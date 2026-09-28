"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar, Header } from "@/components/layout";
import type { NavItem } from "@/components/layout/sidebar";
import { Loader2, LayoutDashboard, Users, AppWindow, ScrollText } from "lucide-react";

const adminNavItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Employees", href: "/employees", icon: Users },
  { name: "Applications", href: "/applications", icon: AppWindow },
  { name: "Audit Logs", href: "/audit", icon: ScrollText },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, isSuperAdmin, mustChangePassword, authError, checkAuth } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isLoading || authError) return;

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (mustChangePassword) {
      router.push("/setup-account");
      return;
    }

    if (!isSuperAdmin) {
      router.push("/portal");
      return;
    }
  }, [isLoading, isAuthenticated, isSuperAdmin, mustChangePassword, authError, router]);

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
    return <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6" role="alert">
      <p>{authError}</p>
      <button className="rounded-md border px-4 py-2" onClick={() => checkAuth()}>Try again</button>
    </div>;
  }

  if (!isAuthenticated || mustChangePassword || !isSuperAdmin) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar navItems={adminNavItems} />
      <div
        className={`flex flex-1 flex-col transition-all duration-300 ${
          sidebarCollapsed ? "ml-[72px]" : "ml-64"
        }`}
      >
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
