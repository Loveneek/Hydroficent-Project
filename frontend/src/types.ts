import { CheckCircle2, Droplet } from "lucide-react";

export type Severity = "success" | "warning" | "critical" | "info" | "neutral";

export type TrendPoint = {
  time: string;
  flow: number;
  pressureUp: number;
  pressureDown: number;
};

export type KpiCardData = {
  label: string;
  value: number;
  display?: string;
  hint?: string;
  unit: string;
  // Decimal places to show once animated in. Omit for whole numbers.
  decimals?: number;
  icon: typeof Droplet;
  severity: Severity;
  sparkline: string;
};

export type EventItem = {
  time: string;
  title: string;
  detail: string;
  icon: typeof CheckCircle2;
  severity: Severity;
  chip: string;
};

// Single source of truth for an alert, whether it's shown as a compact card
// in the Dashboard's Alert Queue or a full row on the Alerts page — both
// pages render the same records, just with different layouts.
export type AlertRecord = {
  id: string;
  title: string;
  time: string;
  action: string;
  severity: Severity;
  status: "Active" | "Resolved";
};

export type ReportType = {
  id: string;
  title: string;
  description: string;
  icon: typeof Droplet;
  defaultRange: string;
};

export type RecentReport = {
  title: string;
  generated: string;
  range: string;
  format: "PDF" | "Excel" | "CSV";
};

export type WeeklyPoint = { week: string; engaged: number | null; bypassed: number | null };

export type Page = "dashboard" | "analytics" | "alerts" | "reports";
