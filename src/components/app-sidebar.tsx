import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Users, FileText, Wallet, Zap, BarChart3, FolderOpen, Settings, LogOut, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tenants", label: "Tenants", icon: Users },
  { to: "/agreements", label: "Agreements", icon: FileText },
  { to: "/rent", label: "Rent", icon: Wallet },
  { to: "/electricity", label: "Electricity", icon: Zap },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/files", label: "Files", icon: FolderOpen },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nav2 = useNavigate();
  async function signOut() {
    await supabase.auth.signOut();
    nav2({ to: "/auth", replace: true });
  }
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="px-5 py-5 flex items-center gap-2 border-b border-sidebar-border">
        <div className="size-8 rounded-md bg-primary text-primary-foreground grid place-items-center">
          <Home className="size-4" />
        </div>
        <div>
          <div className="text-sm font-semibold leading-none">RentBook</div>
          <div className="text-[11px] text-sidebar-foreground/60 mt-1">Landlord workspace</div>
        </div>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {nav.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <Button variant="ghost" onClick={signOut} className="w-full justify-start gap-2 text-sidebar-foreground/80 hover:text-sidebar-foreground">
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>
    </aside>
  );
}