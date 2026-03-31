import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Bot,
  BarChart3,
  Calendar,
  Settings,
  CreditCard,
  Zap,
  ChevronLeft,
  Menu,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useBilling } from "@/context/BillingContext";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/leads", icon: Users, label: "Leads" },
  { to: "/conversations", icon: MessageSquare, label: "Conversations" },
  { to: "/automation", icon: Bot, label: "Automation" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/bookings", icon: Calendar, label: "Bookings" },
  { to: "/settings", icon: Settings, label: "Settings" },
  { to: "/pricing", icon: CreditCard, label: "Pricing" },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const { currentPlan } = useBilling();

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-xl border border-border/80 bg-card/90 p-2.5 text-foreground shadow-[0_12px_30px_hsl(222_47%_3%/0.28)] backdrop-blur-sm md:hidden"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-md md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 flex h-screen flex-col border-r border-sidebar-border/90 bg-[linear-gradient(180deg,hsl(var(--sidebar-background)),hsl(222_36%_7%))] backdrop-blur-sm transition-all duration-300",
          collapsed ? "w-16" : "w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border/80 px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-[0_10px_24px_hsl(var(--primary)/0.22)]">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-display font-bold text-foreground text-lg tracking-tight">
              JafLeadX<span className="text-primary"> AI</span>
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1.5 px-3 py-5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-primary shadow-[0_10px_24px_hsl(222_47%_3%/0.18)]"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/90 hover:text-sidebar-accent-foreground"
                )
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-3 border-t border-sidebar-border/80 p-3">
          {!collapsed && user ? (
            <div className="rounded-xl border border-sidebar-border/70 bg-sidebar-accent/60 px-3 py-2.5">
              <p className="text-sm font-medium text-foreground truncate">{user.fullName}</p>
              <p className="mt-0.5 text-xs text-muted-foreground truncate">{user.email}</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-primary">Plan: {currentPlan.name}</p>
            </div>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            onClick={logout}
            className={cn("w-full justify-start rounded-xl text-sidebar-foreground hover:text-foreground", collapsed && "px-2")}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </Button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden h-12 w-full items-center justify-center border-t border-sidebar-border/80 text-sidebar-foreground transition-colors hover:text-foreground md:flex"
          >
            <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>
      </aside>

      {/* Spacer */}
      <div className={cn("hidden md:block shrink-0 transition-all duration-300", collapsed ? "w-16" : "w-60")} />
    </>
  );
}
