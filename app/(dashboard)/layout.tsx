import { AuthenticatedWorkspace } from "@/components/portal/workspace-shell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedWorkspace admin>{children}</AuthenticatedWorkspace>;
}
