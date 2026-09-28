"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  AppWindow,
  Activity,
  UserPlus,
  Plus,
  ArrowRight,
  LogIn,
  LogOut,
  Key,
  Shield,
  Clock,
} from "lucide-react";
import { api } from "@/lib/api";
import { AuditLog } from "@/types";
import { formatDistanceToNow } from "date-fns";

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  totalApplications: number;
  activeApplications: number;
  recentLogins: number;
}

const actionIcons: Record<string, typeof LogIn> = {
  login: LogIn,
  logout: LogOut,
  logout_all: LogOut,
  token_refresh: Key,
  token_validate: Shield,
  app_authorize: Shield,
};

const actionLabels: Record<string, string> = {
  login: "Logged in",
  logout: "Logged out",
  logout_all: "Logged out all sessions",
  token_refresh: "Token refreshed",
  token_validate: "Token validated",
  app_authorize: "App authorized",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, activityData] = await Promise.all([
          api.stats.getDashboardStats(),
          api.audit.list({ per_page: 5 }),
        ]);
        setStats(statsData);
        setRecentActivity(activityData.data);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your SSO system
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/employees/new">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Employee
            </Link>
          </Button>
          <Button asChild>
            <Link href="/applications/new">
              <Plus className="mr-2 h-4 w-4" />
              New Application
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Employees */}
        <Card className="relative overflow-hidden">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-4">
            <div className="h-full w-full rounded-full bg-primary/10" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Employees
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold">{stats?.totalEmployees ?? "—"}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600 font-medium">
                    {stats?.activeEmployees} active
                  </span>
                  {" · "}
                  {(stats?.totalEmployees ?? 0) - (stats?.activeEmployees ?? 0)} inactive
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Applications */}
        <Card className="relative overflow-hidden">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-4">
            <div className="h-full w-full rounded-full bg-accent/30" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Applications
            </CardTitle>
            <AppWindow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold">{stats?.totalApplications ?? "—"}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600 font-medium">
                    {stats?.activeApplications} active
                  </span>
                  {" · "}
                  {(stats?.totalApplications ?? 0) - (stats?.activeApplications ?? 0)} inactive
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card className="relative overflow-hidden">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-4">
            <div className="h-full w-full rounded-full bg-green-500/10" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recent Logins
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold">{stats?.recentLogins ?? "—"}</div>
                <p className="text-xs text-muted-foreground">
                  In the last 7 days
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="relative overflow-hidden">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-4">
            <div className="h-full w-full rounded-full bg-blue-500/10" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              System Status
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                {stats && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${stats ? "bg-green-500" : "bg-red-500"}`}></span>
              </span>
              <span className={`text-xl font-semibold ${stats ? "text-green-600" : "text-red-600"}`}>{stats ? "Connected" : "Unavailable"}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats ? "SSO API responding" : "Could not load SSO data"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Link
              href="/employees"
              className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-secondary"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Manage Employees</p>
                  <p className="text-sm text-muted-foreground">
                    View, add, or edit employee records
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </Link>

            <Link
              href="/applications"
              className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-secondary"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/30">
                  <AppWindow className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="font-medium">Manage Applications</p>
                  <p className="text-sm text-muted-foreground">
                    Configure SSO client applications
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </Link>

            <Link
              href="/audit"
              className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-secondary"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                  <Activity className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">View Audit Logs</p>
                  <p className="text-sm text-muted-foreground">
                    Monitor authentication activity
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest authentication events</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/audit">
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((log) => {
                  const Icon = actionIcons[log.action] || Activity;
                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 rounded-lg p-2 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            {log.employee?.full_name || "Unknown"}
                          </p>
                          <Badge variant="secondary" className="text-[10px]">
                            {actionLabels[log.action]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(log.created_at), {
                            addSuffix: true,
                          })}
                          {log.application && (
                            <>
                              <span>·</span>
                              <span>{log.application.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
