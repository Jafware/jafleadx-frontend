import {
  BarChart3,
  Bot,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";
import type { SidebarNavItem } from "./dashboard-system";

export const dashboardSidebarMenuItems: SidebarNavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-4.5 w-4.5" />,
  },
  {
    label: "Conversations",
    href: "/conversations",
    icon: <MessageSquare className="h-4.5 w-4.5" />,
  },
  {
    label: "Leads",
    href: "/leads",
    icon: <Users className="h-4.5 w-4.5" />,
  },
  {
    label: "Automation",
    href: "/automation",
    icon: <Bot className="h-4.5 w-4.5" />,
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: <BarChart3 className="h-4.5 w-4.5" />,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: <Settings className="h-4.5 w-4.5" />,
  },
];
