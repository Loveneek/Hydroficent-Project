import { Activity, AlertCircle, AlertTriangle, CalendarDays, CalendarRange, CheckCircle2, Droplet, Gauge, RadioTower, Repeat, Sun } from "lucide-react";
import type { AlertRecord, EventItem, KpiCardData, RecentReport, ReportType, Severity, TrendPoint, WeeklyPoint } from "../types";

export type PropertyId = "pfaff-audi-newmarket" | "save-on-foods-scottsdale-mall";

export type DailyUsageRow = {
  local_date: string;
  reading_count: number;
  data_completeness_pct: number;
  total_volume_gal: number;
  avg_flow_gpm: number;
  max_flow_gpm: number;
  avg_upstream_pressure_psi: number;
  avg_downstream_pressure_psi: number;
  gate_a_stddev: number;
  inferred_mode: "Engaged" | "Bypassed";
};

export type ModeTimelineRow = {
  local_date: string;
  inferred_mode: "Engaged" | "Bypassed";
};

export type HourlyUsageRow = {
  local_date: string;
  local_hour: number;
  total_volume_gal: number;
  avg_flow_gpm: number;
  max_flow_gpm: number;
  avg_upstream_pressure_psi: number;
  avg_downstream_pressure_psi: number;
};

export type DashboardKpiRow = {
  latest_reading_at: string;
  current_flow_gpm: number;
  current_upstream_pressure_psi: number;
  current_downstream_pressure_psi: number;
  first_seen_at: string;
  last_seen_at: string;
  reading_count: number;
  days_observed: number;
  total_volume_gal: number;
  avg_flow_gpm: number;
  max_flow_gpm: number;
  avg_upstream_pressure_psi: number;
  avg_downstream_pressure_psi: number;
  water_stability_index: number;
};

export type GeneratedAlert = {
  local_date: string;
  severity: Severity;
  alert_type: string;
  metric_value: number;
  operator_note: string;
};

export type DataQualityRow = {
  completeness_status: "good" | "warning" | "critical";
  data_completeness_pct: number;
};

export type Manifest = {
  source_files: number;
  tables: {
    daily_usage: number;
    trend_15min: number;
    alerts: number;
  };
  built_at: string;
};

export type PropertyRawData = {
  id: PropertyId;
  name: string;
  alerts: GeneratedAlert[];
  dailyUsage: DailyUsageRow[];
  dashboardKpis: DashboardKpiRow[];
  dataQuality: DataQualityRow[];
  hourlyUsage: HourlyUsageRow[];
  manifest: Manifest;
  modeTimeline: ModeTimelineRow[];
};

export type DashboardData = {
  source: "Supabase";
  dashboardMeta: {
    propertyId: PropertyId;
    propertyName: string;
    latestReadingLabel: string;
    latestCompleteDayLabel: string;
    dataWindowLabel: string;
    readingCount: number;
    daysObserved: number;
    totalVolumeGal: number;
    sourceFiles: number;
    generatedAt: string;
    alertCount: number;
    stabilityIndex: number;
    telemetryCompleteness: number;
  };
  dashboard: {
    trendData: TrendPoint[];
    pressureTrendLabel: string;
    hourlyUsage: { hour: string; value: number; offHours: boolean }[];
    deviceModeHistory: { date: string; state: "Engaged" | "Bypassed" }[];
    todayDeviceState: "Engaged" | "Bypassed";
    deviceModeSummary: {
      startLabel: string;
      midLabel: string;
      endLabel: string;
      engagedDays: number;
      bypassedDays: number;
      totalDays: number;
      availabilityPct: number;
    };
    kpis: KpiCardData[];
    compareStats: {
      label: string;
      today: string;
      avg: string;
      change: string;
      trend: "up" | "down";
    }[];
    events: EventItem[];
  };
  alerts: {
    allAlerts: AlertRecord[];
    activeAlerts: AlertRecord[];
    alertFrequency: { day: string; count: number }[];
    severityBreakdown: { name: string; value: number; color: string }[];
    alertsKpis: {
      label: string;
      value: string;
      caption: string;
      icon: typeof Droplet;
      severity: Severity;
    }[];
  };
  analytics: {
    weeklyVolumeTrend: WeeklyPoint[];
    periodComparison: {
      period: string;
      "Device Bypassed": number;
      "Device Engaged": number;
    }[];
    analyticsMeta: {
      reviewLabel: string;
      weeklyChartDescription: string;
      periodComparisonDescription: string;
      confidenceHeadline: string;
      confidenceCaption: string;
      engagedDaily: string;
      bypassedDaily: string;
      confidenceNote: string;
      reliabilityDescription: string;
    };
    maintenanceSignal: {
      title: string;
      description: string;
      firstLabel: string;
      latestLabel: string;
      firstValue: string;
      latestValue: string;
      change: string;
      severity: "warning" | "info";
    };
    analyticsKpis: {
      label: string;
      value: string;
      caption: string;
      icon: typeof Droplet;
      severity: Severity;
    }[];
    completeness: number[];
    pressureResult: string;
  };
  reports: {
    analysis: Record<"latest7" | "latest30" | "full", {
      label: string;
      startLabel: string;
      endLabel: string;
      daysObserved: number;
      totalVolumeGal: number;
      avgDailyVolumeGal: number;
      latestDayVolumeGal: number;
      peakDayLabel: string;
      peakDayVolumeGal: number;
      avgFlowGpm: number;
      peakFlowGpm: number;
      avgUpstreamPressurePsi: number;
      avgDownstreamPressurePsi: number;
      avgTelemetryPct: number;
      hourlyProfile: { hour: string; value: number; offHours: boolean }[];
      modeSummary: {
        engagedDays: number;
        bypassedDays: number;
        totalDays: number;
      };
    }>;
    reportTypes: ReportType[];
    recentReports: RecentReport[];
  };
};

const formatDate = (value: string, options: Intl.DateTimeFormatOptions = {}) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
    ...options,
  }).format(new Date(value));

const formatFullDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));

const hourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

const average = (values: number[]) =>
  values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;

const percentChange = (today: number, avg: number) => {
  if (!Number.isFinite(avg) || avg === 0) return "0%";
  const value = ((today - avg) / avg) * 100;
  return `${value >= 0 ? "+" : ""}${Math.round(value)}%`;
};

const makeSparkline = (values: number[]) => {
  const width = 84;
  const height = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  return values
    .map((value, index) => {
      const x = 4 + (index * (width - 4)) / Math.max(values.length - 1, 1);
      const y = 4 + height - ((value - min) / span) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
};

const titleFor = (alert: GeneratedAlert) => {
  if (alert.alert_type === "High pressure day") {
    return `High pressure day · ${Math.round(alert.metric_value)} psi`;
  }
  if (alert.alert_type === "Low data completeness") {
    return `Low telemetry completeness · ${alert.metric_value.toFixed(0)}%`;
  }
  if (alert.alert_type === "High flow day") {
    return `High flow day · ${alert.metric_value.toFixed(1)} GPM`;
  }
  return alert.alert_type;
};

const byModeAverage = (rows: DailyUsageRow[], mode: "Engaged" | "Bypassed") =>
  average(rows.filter((row) => row.inferred_mode === mode).map((row) => row.total_volume_gal));

const weekStartLabel = (value: string) => {
  const date = new Date(value);
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - day);
  return formatDate(date.toISOString());
};

export function buildDashboardData(raw: PropertyRawData, source: DashboardData["source"]): DashboardData {
  const dailyUsage = raw.dailyUsage;
  const completeDays = dailyUsage.filter((day) => day.data_completeness_pct >= 90);
  const latestCompleteDay = completeDays.at(-1) ?? dailyUsage.at(-1)!;
  const latestCompleteDate = latestCompleteDay.local_date;
  const latestCompleteHourlyRows = raw.hourlyUsage.filter((row) => row.local_date === latestCompleteDate);
  const hasPressureReadings = (localDate: string) =>
    raw.hourlyUsage.some(
      (row) =>
        row.local_date === localDate &&
        Number.isFinite(row.avg_upstream_pressure_psi) &&
        Number.isFinite(row.avg_downstream_pressure_psi) &&
        row.avg_upstream_pressure_psi > 0 &&
        row.avg_downstream_pressure_psi > 0,
    );
  const latestPressureDay = [...completeDays].reverse().find((day) => hasPressureReadings(day.local_date)) ?? latestCompleteDay;
  const pressureHourlyRows = raw.hourlyUsage.filter(
    (row) =>
      row.local_date === latestPressureDay.local_date &&
      Number.isFinite(row.avg_upstream_pressure_psi) &&
      Number.isFinite(row.avg_downstream_pressure_psi) &&
      row.avg_upstream_pressure_psi > 0 &&
      row.avg_downstream_pressure_psi > 0,
  );
  const previous30Days = completeDays.slice(-30);
  const last7Days = completeDays.slice(-7);
  const generatedAlerts = raw.alerts;
  const dashboardKpi = raw.dashboardKpis[0];

  const makeReportAnalysis = (
    rows: DailyUsageRow[],
    label: string,
  ): DashboardData["reports"]["analysis"]["latest7"] => {
    const periodRows = rows.length ? rows : completeDays;
    const dates = new Set(periodRows.map((row) => row.local_date));
    const periodHourlyRows = raw.hourlyUsage.filter((row) => dates.has(row.local_date));
    const latestDay = periodRows.at(-1) ?? latestCompleteDay;
    const peakDay = [...periodRows].sort((a, b) => b.total_volume_gal - a.total_volume_gal)[0] ?? latestDay;
    const hourlyProfile = Array.from({ length: 24 }, (_, hour) => {
      const hourRows = periodHourlyRows.filter((row) => row.local_hour === hour);
      return {
        hour: hourLabel(hour),
        value: Math.round(average(hourRows.map((row) => row.total_volume_gal))),
        offHours: hour < 6 || hour >= 21,
      };
    });

    return {
      label,
      startLabel: formatFullDate(periodRows.at(0)?.local_date ?? latestDay.local_date),
      endLabel: formatFullDate(periodRows.at(-1)?.local_date ?? latestDay.local_date),
      daysObserved: periodRows.length,
      totalVolumeGal: periodRows.reduce((total, row) => total + row.total_volume_gal, 0),
      avgDailyVolumeGal: average(periodRows.map((row) => row.total_volume_gal)),
      latestDayVolumeGal: latestDay.total_volume_gal,
      peakDayLabel: formatFullDate(peakDay.local_date),
      peakDayVolumeGal: peakDay.total_volume_gal,
      avgFlowGpm: average(periodRows.map((row) => row.avg_flow_gpm)),
      peakFlowGpm: Math.max(...periodRows.map((row) => row.max_flow_gpm), 0),
      avgUpstreamPressurePsi: average(periodRows.map((row) => row.avg_upstream_pressure_psi)),
      avgDownstreamPressurePsi: average(periodRows.map((row) => row.avg_downstream_pressure_psi)),
      avgTelemetryPct: average(periodRows.map((row) => row.data_completeness_pct)),
      hourlyProfile,
      modeSummary: {
        engagedDays: periodRows.filter((row) => row.inferred_mode === "Engaged").length,
        bypassedDays: periodRows.filter((row) => row.inferred_mode === "Bypassed").length,
        totalDays: periodRows.length,
      },
    };
  };

  const dashboardMeta = {
    propertyId: raw.id,
    propertyName: raw.name,
    latestReadingLabel: formatFullDate(dashboardKpi.latest_reading_at),
    latestCompleteDayLabel: formatFullDate(latestCompleteDate),
    dataWindowLabel: `${formatDate(dashboardKpi.first_seen_at)}-${formatDate(dashboardKpi.last_seen_at)}, 2026`,
    readingCount: dashboardKpi.reading_count,
    daysObserved: dashboardKpi.days_observed,
    totalVolumeGal: dashboardKpi.total_volume_gal,
    sourceFiles: raw.manifest.source_files,
    generatedAt: raw.manifest.built_at,
    alertCount: generatedAlerts.length,
    stabilityIndex: Math.round(dashboardKpi.water_stability_index),
    telemetryCompleteness: Math.round(average(completeDays.map((day) => day.data_completeness_pct))),
  };

  const trendData: TrendPoint[] = pressureHourlyRows.map((row) => ({
    time: hourLabel(row.local_hour),
    flow: Number(row.avg_flow_gpm.toFixed(2)),
    pressureUp: Number(row.avg_upstream_pressure_psi.toFixed(2)),
    pressureDown: Number(row.avg_downstream_pressure_psi.toFixed(2)),
  }));
  const pressureTrendLabel = formatFullDate(latestPressureDay.local_date);

  const hourlyUsage = Array.from({ length: 24 }, (_, hour) => {
    const rows = raw.hourlyUsage.filter((row) => row.local_hour === hour);
    return {
      hour: hourLabel(hour),
      value: Math.round(average(rows.map((row) => row.total_volume_gal))),
      offHours: hour < 6 || hour >= 21,
    };
  });

  const deviceModeHistory = raw.modeTimeline.slice(-14).map((day) => ({
    date: formatDate(day.local_date),
    state: day.inferred_mode,
  }));
  const todayDeviceState = deviceModeHistory.at(-1)?.state ?? "Bypassed";
  const deviceModeSummary = {
    startLabel: deviceModeHistory.at(0)?.date ?? "",
    midLabel: deviceModeHistory.at(Math.floor(deviceModeHistory.length / 2))?.date ?? "",
    endLabel: deviceModeHistory.at(-1)?.date ?? "",
    engagedDays: deviceModeHistory.filter((day) => day.state === "Engaged").length,
    bypassedDays: deviceModeHistory.filter((day) => day.state === "Bypassed").length,
    totalDays: deviceModeHistory.length,
    availabilityPct: Math.round(latestCompleteDay.data_completeness_pct),
  };

  const kpis: KpiCardData[] = [
    {
      label: "Water Flow",
      value: Number(dashboardKpi.current_flow_gpm.toFixed(2)),
      unit: "GPM",
      decimals: 2,
      icon: Droplet,
      severity: dashboardKpi.current_flow_gpm > dashboardKpi.avg_flow_gpm * 1.6 ? "warning" : "success",
      sparkline: makeSparkline(last7Days.map((day) => day.avg_flow_gpm)),
    },
    {
      label: "Upstream Pressure",
      value: Number(dashboardKpi.current_upstream_pressure_psi.toFixed(1)),
      unit: "psi",
      decimals: 1,
      icon: Gauge,
      severity: dashboardKpi.current_upstream_pressure_psi >= 75 ? "warning" : "success",
      sparkline: makeSparkline(last7Days.map((day) => day.avg_upstream_pressure_psi)),
    },
    {
      label: "Downstream Pressure",
      value: Number(dashboardKpi.current_downstream_pressure_psi.toFixed(1)),
      unit: "psi",
      decimals: 1,
      icon: Gauge,
      severity: "success",
      sparkline: makeSparkline(last7Days.map((day) => day.avg_downstream_pressure_psi)),
    },
    {
      label: "Daily Volume",
      value: Math.round(latestCompleteDay.total_volume_gal),
      unit: "gal",
      hint: `${latestCompleteDay.inferred_mode} · ${dashboardMeta.latestCompleteDayLabel}`,
      icon: Activity,
      severity: latestCompleteDay.inferred_mode === "Engaged" ? "success" : "info",
      sparkline: makeSparkline(last7Days.map((day) => day.total_volume_gal)),
    },
  ];

  const flow30DayAvg = average(previous30Days.map((day) => day.avg_flow_gpm));
  const pressure30DayAvg = average(previous30Days.map((day) => day.avg_upstream_pressure_psi));
  const compareStats = [
    {
      label: "Water Flow",
      today: `${latestCompleteDay.avg_flow_gpm.toFixed(2)} GPM`,
      avg: `${flow30DayAvg.toFixed(2)} GPM`,
      change: percentChange(latestCompleteDay.avg_flow_gpm, flow30DayAvg),
      trend: latestCompleteDay.avg_flow_gpm >= flow30DayAvg ? "up" as const : "down" as const,
    },
    {
      label: "Upstream Pressure",
      today: `${Math.round(latestCompleteDay.avg_upstream_pressure_psi)} psi`,
      avg: `${Math.round(pressure30DayAvg)} psi`,
      change: percentChange(latestCompleteDay.avg_upstream_pressure_psi, pressure30DayAvg),
      trend: latestCompleteDay.avg_upstream_pressure_psi >= pressure30DayAvg ? "up" as const : "down" as const,
    },
  ];

  const peakHour = [...latestCompleteHourlyRows].sort((a, b) => b.total_volume_gal - a.total_volume_gal)[0];
  const offHourPeak = [...latestCompleteHourlyRows]
    .filter((row) => row.local_hour < 6 || row.local_hour >= 21)
    .sort((a, b) => b.total_volume_gal - a.total_volume_gal)[0];
  const events: EventItem[] = [
    {
      time: offHourPeak ? hourLabel(offHourPeak.local_hour) : "00:00",
      title: "Largest off-hours usage window",
      detail: offHourPeak
        ? `${Math.round(offHourPeak.total_volume_gal).toLocaleString()} gal used during an off-hours window on ${dashboardMeta.latestCompleteDayLabel}.`
        : "No off-hours usage window was available for the latest complete day.",
      icon: AlertCircle,
      severity: offHourPeak && offHourPeak.total_volume_gal > 500 ? "warning" : "info",
      chip: "Review",
    },
    {
      time: peakHour ? hourLabel(peakHour.local_hour) : "12:00",
      title: "Peak demand period",
      detail: peakHour
        ? `${Math.round(peakHour.total_volume_gal).toLocaleString()} gal used, with max flow of ${peakHour.max_flow_gpm.toFixed(1)} GPM.`
        : "Peak hourly usage is unavailable for the latest complete day.",
      icon: Repeat,
      severity: "info",
      chip: "Usage",
    },
    {
      time: "23:59",
      title: "Telemetry completeness",
      detail: `${latestCompleteDay.data_completeness_pct.toFixed(0)}% of expected readings were received for ${dashboardMeta.latestCompleteDayLabel}.`,
      icon: RadioTower,
      severity: latestCompleteDay.data_completeness_pct >= 90 ? "success" : "warning",
      chip: latestCompleteDay.data_completeness_pct >= 90 ? "Normal" : "Review",
    },
    {
      time: "Daily",
      title: "Mode classification",
      detail: `Gate activity classified the latest complete day as ${latestCompleteDay.inferred_mode}.`,
      icon: CheckCircle2,
      severity: latestCompleteDay.inferred_mode === "Engaged" ? "success" : "info",
      chip: latestCompleteDay.inferred_mode,
    },
  ];

  const sortedGeneratedAlerts = [...generatedAlerts].sort(
    (a, b) => new Date(b.local_date).getTime() - new Date(a.local_date).getTime(),
  );
  const activeAlertLimit = Math.min(4, sortedGeneratedAlerts.length);
  const allAlerts: AlertRecord[] = sortedGeneratedAlerts.map((alert, index) => ({
    id: `${alert.alert_type.toLowerCase().replaceAll(" ", "-")}-${alert.local_date}-${index}`,
    title: titleFor(alert),
    time: formatDate(alert.local_date, { year: "numeric" }),
    action: alert.operator_note,
    severity: alert.severity,
    status: index < activeAlertLimit ? "Active" : "Resolved",
  }));
  const activeAlerts = allAlerts.filter((alert) => alert.status === "Active");
  const issueCounts = generatedAlerts.reduce<Record<string, number>>((acc, alert) => {
    acc[alert.alert_type] = (acc[alert.alert_type] ?? 0) + 1;
    return acc;
  }, {});
  const alertFrequency = Object.entries(issueCounts)
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => b.count - a.count);
  const severityCounts = generatedAlerts.reduce<Record<Severity, number>>(
    (acc, alert) => {
      acc[alert.severity] += 1;
      return acc;
    },
    { critical: 0, warning: 0, info: 0, success: 0, neutral: 0 },
  );
  const severityBreakdown = [
    { name: "Critical", value: severityCounts.critical, color: "var(--critical)" },
    { name: "Warning", value: severityCounts.warning, color: "var(--warning)" },
    { name: "Info", value: severityCounts.info, color: "var(--info)" },
    { name: "Resolved", value: allAlerts.filter((alert) => alert.status === "Resolved").length, color: "var(--success)" },
  ].filter((entry) => entry.value > 0);
  const criticalOrWarningQualityDays = raw.dataQuality.filter((row) => row.completeness_status !== "good").length;
  const avgTelemetry = Math.round(average(raw.dataQuality.map((row) => row.data_completeness_pct)));
  const alertsKpis = [
    {
      label: "Open Alerts",
      value: String(activeAlerts.length),
      caption: `${generatedAlerts.length} generated across ${dashboardMeta.daysObserved} days`,
      icon: AlertTriangle,
      severity: activeAlerts.length ? "warning" as const : "success" as const,
    },
    {
      label: "Alert History",
      value: String(generatedAlerts.length),
      caption: "from full CSV history",
      icon: Activity,
      severity: "info" as const,
    },
    {
      label: "Data Quality Days",
      value: String(criticalOrWarningQualityDays),
      caption: "below 90% completeness",
      icon: RadioTower,
      severity: criticalOrWarningQualityDays ? "warning" as const : "success" as const,
    },
    {
      label: "Telemetry Received",
      value: `${avgTelemetry}%`,
      caption: `${dashboardMeta.readingCount.toLocaleString()} readings analyzed`,
      icon: CheckCircle2,
      severity: avgTelemetry >= 90 ? "success" as const : "warning" as const,
    },
  ];

  const midpoint = Math.max(Math.floor(completeDays.length / 2), 1);
  const firstHalf = completeDays.slice(0, midpoint);
  const secondHalf = completeDays.slice(midpoint);
  const groupedByWeek = completeDays.reduce<Record<string, DailyUsageRow[]>>((acc, day) => {
    const label = weekStartLabel(day.local_date);
    acc[label] = [...(acc[label] ?? []), day];
    return acc;
  }, {});
  const weeklyVolumeTrend = Object.entries(groupedByWeek).map(([week, rows]) => ({
    week,
    engaged: rows.some((row) => row.inferred_mode === "Engaged") ? Math.round(byModeAverage(rows, "Engaged")) : null,
    bypassed: rows.some((row) => row.inferred_mode === "Bypassed") ? Math.round(byModeAverage(rows, "Bypassed")) : null,
  }));
  const periodComparison = [
    {
      period: "First Half",
      "Device Bypassed": Math.round(byModeAverage(firstHalf, "Bypassed")),
      "Device Engaged": Math.round(byModeAverage(firstHalf, "Engaged")),
    },
    {
      period: "Second Half",
      "Device Bypassed": Math.round(byModeAverage(secondHalf, "Bypassed")),
      "Device Engaged": Math.round(byModeAverage(secondHalf, "Engaged")),
    },
  ];
  const engagedAvg = byModeAverage(completeDays, "Engaged");
  const bypassedAvg = byModeAverage(completeDays, "Bypassed");
  const hasModeComparison = engagedAvg > 0 && bypassedAvg > 0;
  const modeDeltaPct = hasModeComparison ? ((bypassedAvg - engagedAvg) / bypassedAvg) * 100 : 0;
  const avgCompleteness = Math.round(average(dailyUsage.map((day) => day.data_completeness_pct)));
  const avgPressure = average(completeDays.map((day) => day.avg_upstream_pressure_psi));
  const maxFlow = Math.max(...completeDays.map((day) => day.max_flow_gpm));
  const analyticsMeta = {
    reviewLabel: `Full data review · ${dashboardMeta.dataWindowLabel} · ${dashboardMeta.propertyName}`,
    weeklyChartDescription: `Average daily volume by week across ${completeDays.length} complete days.`,
    periodComparisonDescription: "Average daily water use in the first half vs. second half of the available data window.",
    confidenceHeadline: hasModeComparison ? `${Math.abs(modeDeltaPct).toFixed(0)}%` : "Baseline",
    confidenceCaption: hasModeComparison
      ? modeDeltaPct >= 0
        ? "less water used when the device is engaged"
        : "more water used when the device is engaged"
      : "mode comparison is not available for this property",
    engagedDaily: engagedAvg ? `${Math.round(engagedAvg).toLocaleString()} gal/day` : "No engaged days",
    bypassedDaily: bypassedAvg ? `${Math.round(bypassedAvg).toLocaleString()} gal/day` : "No bypassed days",
    confidenceNote: hasModeComparison
      ? `Measured across ${completeDays.length} complete days from the selected property dataset.`
      : "This property does not have both engaged and bypassed days in the selected data window.",
    reliabilityDescription: `How much of each day's data arrived across ${dailyUsage.length} observed days.`,
  };
  const monthlyGate = completeDays.reduce<Record<string, number[]>>((acc, day) => {
    const label = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(day.local_date));
    acc[label] = [...(acc[label] ?? []), day.gate_a_stddev];
    return acc;
  }, {});
  const monthlyGateEntries = Object.entries(monthlyGate);
  const firstGate = average(monthlyGateEntries.at(0)?.[1] ?? []);
  const lastGate = average(monthlyGateEntries.at(-1)?.[1] ?? []);
  const gateChangePct = firstGate > 0 ? ((lastGate - firstGate) / firstGate) * 100 : 0;
  const maintenanceSignal = {
    title: "Maintenance Signal: Gate Activity Trend",
    description:
      "Compares early-window and latest-window gate movement. A rising pattern can suggest the device is working harder to reach similar pressure behavior.",
    firstLabel: monthlyGateEntries.at(0)?.[0] ?? "Start",
    latestLabel: monthlyGateEntries.at(-1)?.[0] ?? "Latest",
    firstValue: firstGate > 0 ? firstGate.toFixed(3) : "0.000",
    latestValue: lastGate > 0 ? lastGate.toFixed(3) : "0.000",
    change: `${gateChangePct >= 0 ? "+" : ""}${Math.round(gateChangePct)}%`,
    severity: gateChangePct > 50 ? "warning" as const : "info" as const,
  };
  const analyticsKpis = [
    {
      label: "Mode Impact",
      value: analyticsMeta.confidenceHeadline,
      caption: analyticsMeta.confidenceCaption,
      icon: Activity,
      severity: hasModeComparison ? "success" as const : "info" as const,
    },
    {
      label: "Avg. Daily Use",
      value: `${Math.round(average(completeDays.map((day) => day.total_volume_gal))).toLocaleString()} gal`,
      caption: "complete days only",
      icon: Droplet,
      severity: "info" as const,
    },
    {
      label: "Peak Flow",
      value: `${maxFlow.toFixed(1)} GPM`,
      caption: `latest complete day: ${formatDate(latestCompleteDay.local_date)}`,
      icon: Gauge,
      severity: maxFlow > 20 ? "warning" as const : "success" as const,
    },
    {
      label: "Data Reliability",
      value: `${avgCompleteness}%`,
      caption: `${dashboardMeta.daysObserved} observed days`,
      icon: RadioTower,
      severity: avgCompleteness >= 90 ? "success" as const : "warning" as const,
    },
  ];

  const reportTypes: ReportType[] = [
    { id: "daily", title: "Daily Summary", description: "Today's KPIs, active alerts, and 24-hour trends.", icon: Sun, defaultRange: "Last 24h" },
    { id: "weekly", title: "Weekly Summary", description: "Last 7 days vs. prior week, peak usage times, alert resolution.", icon: CalendarDays, defaultRange: "Last 7d" },
    { id: "monthly", title: "Monthly Summary", description: "Full month trends, baseline comparison, alerts, and usage patterns.", icon: CalendarRange, defaultRange: "Last 30d" },
    { id: "alerts", title: "Alerts Report", description: "All alerts in the period, severity mix, and response times.", icon: AlertTriangle, defaultRange: "Last 7d" },
    { id: "performance", title: "System Performance", description: "Uptime, telemetry reliability, and maintenance signals.", icon: Activity, defaultRange: "Last 30d" },
    { id: "consumption", title: "Water Consumption", description: "Usage trends, savings vs. baseline, and peak-hour analysis.", icon: Droplet, defaultRange: "Last 30d" },
  ];
  const recentReports: RecentReport[] = [
    { title: "Full Data Summary", generated: "Latest refresh", range: dashboardMeta.dataWindowLabel, format: "PDF" },
    { title: "Daily Summary", generated: "Latest refresh", range: dashboardMeta.latestCompleteDayLabel, format: "PDF" },
    { title: "Alerts Report", generated: "Latest refresh", range: `${dashboardMeta.alertCount} generated alerts`, format: "CSV" },
    { title: "Telemetry Reliability", generated: "Latest refresh", range: `${dashboardMeta.daysObserved} observed days`, format: "PDF" },
    { title: "Water Consumption", generated: "Latest refresh", range: `${Math.round(dashboardMeta.totalVolumeGal).toLocaleString()} gal`, format: "Excel" },
  ];
  const reportAnalysis = {
    latest7: makeReportAnalysis(completeDays.slice(-7), "Latest 7 complete days"),
    latest30: makeReportAnalysis(completeDays.slice(-30), "Latest 30 complete days"),
    full: makeReportAnalysis(completeDays, dashboardMeta.dataWindowLabel),
  };

  return {
    source,
    dashboardMeta,
    dashboard: { trendData, pressureTrendLabel, hourlyUsage, deviceModeHistory, todayDeviceState, deviceModeSummary, kpis, compareStats, events },
    alerts: { allAlerts, activeAlerts, alertFrequency, severityBreakdown, alertsKpis },
    analytics: {
      weeklyVolumeTrend,
      periodComparison,
      analyticsMeta,
      maintenanceSignal,
      analyticsKpis,
      completeness: dailyUsage.map((day) => Math.round(day.data_completeness_pct)),
      pressureResult: `${Math.round(avgPressure)} psi avg`,
    },
    reports: { analysis: reportAnalysis, reportTypes, recentReports },
  };
}
