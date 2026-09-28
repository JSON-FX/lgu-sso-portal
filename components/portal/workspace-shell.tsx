"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AppWindow, ChevronDown, FileText, KeyRound, LayoutGrid, Loader2, LogOut, Menu, Settings2, UserRound, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { PortalBrand, PortalStatus } from "@/components/portal/design";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const employeeNav = [
  { href: "/portal/applications", label: "My applications", icon: LayoutGrid },
  { href: "/portal", label: "My profile", icon: UserRound },
  { href: "/portal/change-password", label: "Change password", icon: KeyRound },
];
const adminNav = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/applications", label: "Applications", icon: AppWindow },
  { href: "/audit", label: "Audit trail", icon: FileText },
];

export function AuthenticatedWorkspace({ admin = false, children }: { admin?: boolean; children: ReactNode }) {
  const { isAuthenticated, isLoading, isSuperAdmin, mustChangePassword, authError, checkAuth } = useAuth();
  const router = useRouter();

  useEffect(() => { void checkAuth(); }, [checkAuth]);
  useEffect(() => {
    if (isLoading || authError) return;
    if (!isAuthenticated) router.replace("/login");
    else if (mustChangePassword) router.replace("/setup-account");
    else if (admin && !isSuperAdmin) router.replace("/portal/applications");
  }, [admin, authError, isAuthenticated, isLoading, isSuperAdmin, mustChangePassword, router]);

  if (isLoading) return <div className="flex min-h-screen items-center justify-center gap-3" role="status"><Loader2 className="animate-spin" aria-hidden="true" />Loading your information…</div>;
  if (authError) return <div className="mx-auto flex min-h-screen max-w-lg items-center px-6"><PortalStatus kind="error" title="Sign-in service is temporarily unavailable." action={<Button variant="outline" onClick={() => void checkAuth()}>Try again</Button>}>{authError}</PortalStatus></div>;
  if (!isAuthenticated || mustChangePassword || (admin && !isSuperAdmin)) return null;
  return <WorkspaceShell admin={admin}>{children}</WorkspaceShell>;
}

export function WorkspaceShell({ admin = false, children }: { admin?: boolean; children: ReactNode }) {
  const { user, isSuperAdmin, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [globalSignout, setGlobalSignout] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const navItems = admin ? adminNav : employeeNav;
  const accountName = user?.full_name || "My account";

  const signOut = async (everywhere: boolean) => {
    setSigningOut(true);
    try {
      await logout(everywhere);
      setGlobalSignout(false);
      router.replace("/login");
      toast.success(everywhere ? "Signed out everywhere" : "Signed out of LGU Portal");
    } catch {
      toast.error("Sign-out failed. Please try again.");
    } finally {
      setSigningOut(false);
    }
  };

  const nav = (
    <nav aria-label={admin ? "Administration" : "My account"}>
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/portal" && pathname.startsWith(`${href}/`));
        return <Button key={href} asChild variant="ghost" aria-current={active ? "page" : undefined} onClick={() => setMenuOpen(false)}>
          <Link href={href}><Icon size={18} aria-hidden="true" />{label}</Link>
        </Button>;
      })}
      {isSuperAdmin && <>
        <span className="lp-nav-divider" aria-hidden="true" />
        <Button asChild variant="ghost" onClick={() => setMenuOpen(false)}>
          <Link href={admin ? "/portal/applications" : "/dashboard"}><Settings2 size={18} aria-hidden="true" />{admin ? "Employee workspace" : "Administration"}</Link>
        </Button>
      </>}
    </nav>
  );

  return <div className="lp-workspace">
    <a className="lp-skip" href="#main-content">Skip to main content</a>
    <header className="lp-topbar">
      <PortalBrand compact={admin} />
      <div className="lp-top-actions">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild><Button variant="outline" size="icon" className="lp-mobile-menu" aria-label="Open navigation"><Menu /></Button></SheetTrigger>
          <SheetContent side="left" className="lp-mobile-sheet">
            <SheetHeader><SheetTitle>LGU Portal navigation</SheetTitle><SheetDescription>{admin ? "Administration workspace" : "Employee workspace"}</SheetDescription></SheetHeader>
            {nav}
          </SheetContent>
        </Sheet>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="lp-account" aria-label={`Account menu for ${accountName}`}>
              <span className="lp-avatar">{user?.initials || accountName.slice(0, 2).toUpperCase()}</span>
              <span>{accountName}<small>{admin ? "Super administrator" : "Municipal employee"}</small></span>
              <ChevronDown size={16} aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => router.push("/portal")}>My profile</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push("/portal/change-password")}>Change password</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void signOut(false)}><LogOut /> Sign out of LGU Portal</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setGlobalSignout(true)}>Sign out everywhere…</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    <div className={`lp-layout ${admin ? "lp-with-rail" : "lp-with-tabs"}`}>
      <aside className="lp-navigation">
        <p className="lp-eyebrow">{admin ? "Administration" : "Your workspace"}</p>
        {nav}
        {admin && <p className="lp-rail-note">Manage identity and access.<br />Changes affect connected applications.</p>}
      </aside>
      <main id="main-content" className="lp-main">{children}</main>
    </div>
    <footer className="lp-footer"><span>LGU Portal · Identity &amp; access</span><span>Need assistance? Contact your SSO administrator.</span></footer>
    <Dialog open={globalSignout} onOpenChange={setGlobalSignout}>
      <DialogContent>
        <DialogHeader><DialogTitle>Sign out everywhere?</DialogTitle><DialogDescription>This ends your central SSO session and invalidates sessions in connected applications. Save your work before continuing.</DialogDescription></DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setGlobalSignout(false)} disabled={signingOut}>Keep my sessions</Button>
          <Button onClick={() => void signOut(true)} disabled={signingOut}>{signingOut ? "Signing out…" : "Sign out everywhere"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
