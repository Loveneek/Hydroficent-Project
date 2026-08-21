import { AlertTriangle, BarChart3, Droplet, FileText, Home } from "lucide-react";
import type { Page } from "../types";

export const navItems: { label: string; icon: typeof Droplet; page?: Page }[] = [
  { label: "Dashboard", icon: Home, page: "dashboard" },
  { label: "Analytics", icon: BarChart3, page: "analytics" },
  { label: "Alerts", icon: AlertTriangle, page: "alerts" },
  { label: "Reports", icon: FileText, page: "reports" },
];
