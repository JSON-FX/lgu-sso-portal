import { AuthenticatedWorkspace } from "@/components/portal/workspace-shell";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedWorkspace>{children}</AuthenticatedWorkspace>;
}
