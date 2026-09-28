"use client";

import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LogOut, User, ChevronDown, Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface HeaderProps {
  showNotifications?: boolean;
}

export function Header({ showNotifications = true }: HeaderProps) {
  const { user, logout, isSuperAdmin } = useAuth();
  const router = useRouter();

  const handleLogout = async (everywhere = false) => {
    try {
      await logout(everywhere);
      router.push("/login");
      toast.success(everywhere ? "Signed out everywhere" : "Signed out successfully");
    } catch {
      toast.error("Failed to logout");
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Left side - can add breadcrumbs or search here */}
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-foreground">
          Welcome back, {user?.first_name || "Admin"}
        </h1>
      </div>

      {/* Right side - notifications and user menu */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        {showNotifications && (
          <Button
            variant="ghost"
            size="icon"
            className="relative text-muted-foreground hover:text-foreground"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
              3
            </span>
          </Button>
        )}

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 px-2 hover:bg-secondary"
            >
              <Avatar className="h-8 w-8 border-2 border-primary/20">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {user?.initials || "AD"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start md:flex">
                <span className="text-sm font-medium">
                  {user?.full_name || "Administrator"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {isSuperAdmin ? "Super Admin" : "Employee"}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.full_name}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={() => handleLogout()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => handleLogout(true)}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out everywhere</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
