import { useState } from "react";
import { CheckCircle2, Download, SlidersHorizontal, X } from "lucide-react";
import { Reveal } from "../components/Reveal";
import { cardClass } from "../theme";
import type { RecentReport, ReportType } from "../types";
import type { DashboardData } from "../data/buildDashboardData";

type ReportsPageProps = {
  data: DashboardData;
};

type IncludeOptions = {
  metrics: boolean;
  alerts: boolean;
  charts: boolean;
  notes: boolean;
};

type ReportRow = {
  section: "Overview" | "Consumption" | "Sensors" | "Alerts" | "Charts" | "Financial Impact" | "Notes";
  name: string;
  value: string;
  note: string;
};

export function ReportsPage({ data }: ReportsPageProps) {
  const [openReport, setOpenReport] = useState<ReportType | null>(null);
  const [format, setFormat] = useState<"PDF" | "Excel" | "CSV">("PDF");
  const [include, setInclude] = useState({ metrics: true, alerts: true, charts: true, notes: true });
  const [justDownloaded, setJustDownloaded] = useState(false);
  const [downloadedReports, setDownloadedReports] = useState<Set<string>>(new Set());
  const { recentReports, reportTypes } = data.reports;

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const defaultInclude: IncludeOptions = { metrics: true, alerts: true, charts: true, notes: true };
  const blendedWaterRatePerThousandGal = 18;

  const formatNumber = (value: number, decimals = 0) =>
    Number.isFinite(value)
      ? value.toLocaleString("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : "0";

  const formatMoney = (value: number) =>
    value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  const formatRate = (value: number) =>
    value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });

  const parseNumber = (value: string) => Number(value.replace(/[^0-9.-]/g, "")) || 0;

  const findKpi = (label: string) => data.dashboard.kpis.find((kpi) => kpi.label === label);

  const reportScopeFor = (reportTitle: string) => {
    if (reportTitle === "Full Data Summary") return data.reports.analysis.full;
    if (reportTitle === "Monthly Summary" || reportTitle === "System Performance" || reportTitle === "Water Consumption") {
      return data.reports.analysis.latest30;
    }
    return data.reports.analysis.latest7;
  };

  const buildReportFacts = (reportTitle: string) => {
    const scope = reportScopeFor(reportTitle);
    const currentFlow = Number(findKpi("Water Flow")?.value ?? scope.avgFlowGpm);
    const baselineDailyUse = parseNumber(data.analytics.analyticsKpis.find((kpi) => kpi.label === "Avg. Daily Use")?.value ?? "0");
    const costPerGal = blendedWaterRatePerThousandGal / 1000;
    const periodCost = scope.totalVolumeGal * costPerGal;
    const latestDayCost = scope.latestDayVolumeGal * costPerGal;
    const avgDayCost = scope.avgDailyVolumeGal * costPerGal;
    const baselineDayCost = baselineDailyUse * costPerGal;
    const costDelta = latestDayCost - avgDayCost;
    const baselineDelta = latestDayCost - baselineDayCost;
    const costDeltaLabel =
      costDelta >= 0
        ? `${formatMoney(costDelta)} above period average day`
        : `${formatMoney(Math.abs(costDelta))} below period average day`;
    const baselineDeltaLabel =
      baselineDelta >= 0
        ? `${formatMoney(baselineDelta)} above full-data baseline`
        : `${formatMoney(Math.abs(baselineDelta))} below full-data baseline`;
    const pressureSpread = scope.avgUpstreamPressurePsi - scope.avgDownstreamPressurePsi;
    const peakHour = scope.hourlyProfile.reduce(
      (best, row) => (row.value > best.value ? row : best),
      scope.hourlyProfile[0] ?? { hour: "00:00", value: 0, offHours: false },
    );
    const overnightUsage = scope.hourlyProfile
      .filter((row) => row.offHours)
      .reduce((total, row) => total + row.value, 0);
    const daytimeUsage = scope.hourlyProfile
      .filter((row) => !row.offHours)
      .reduce((total, row) => total + row.value, 0);

    return {
      scope,
      currentFlow,
      baselineDailyUse,
      costPerGal,
      periodCost,
      latestDayCost,
      avgDayCost,
      baselineDayCost,
      costDelta,
      costDeltaLabel,
      baselineDeltaLabel,
      pressureSpread,
      peakHour,
      overnightUsage,
      daytimeUsage,
    };
  };

  const reportRows = (reportTitle: string, selectedInclude: IncludeOptions): ReportRow[] => {
    const { dashboardMeta } = data;
    const facts = buildReportFacts(reportTitle);
    const consumptionRows = [
      {
        section: "Consumption" as const,
        name: "Latest Complete Day Volume",
        value: `${formatNumber(facts.scope.latestDayVolumeGal)} gal`,
        note: `${dashboardMeta.latestCompleteDayLabel}; compared with ${formatNumber(facts.scope.avgDailyVolumeGal)} gal/day inside this report period.`,
      },
      {
        section: "Consumption" as const,
        name: `${facts.scope.label} Consumption`,
        value: `${formatNumber(facts.scope.totalVolumeGal)} gal`,
        note: `Measured from ${facts.scope.startLabel} to ${facts.scope.endLabel} across ${facts.scope.daysObserved} complete days.`,
      },
      {
        section: "Consumption" as const,
        name: "Peak Usage Hour",
        value: `${facts.peakHour.hour} - ${formatNumber(facts.peakHour.value)} gal`,
        note: facts.peakHour.offHours ? "Peak occurred during off-hours and should be reviewed." : "Peak occurred during normal operating hours.",
      },
      {
        section: "Consumption" as const,
        name: "Off-hours Consumption",
        value: `${formatNumber(facts.overnightUsage)} gal`,
        note: `${formatNumber(facts.daytimeUsage)} gal occurred during normal operating hours in the report-period hourly profile.`,
      },
    ];

    const sensorRows = [
      {
        section: "Sensors" as const,
        name: "Flow Sensor",
        value: `${formatNumber(facts.currentFlow, 2)} GPM current`,
        note: `Peak observed flow in this report period is ${formatNumber(facts.scope.peakFlowGpm, 1)} GPM; this is the primary signal for real-time consumption movement.`,
      },
      {
        section: "Sensors" as const,
        name: "Upstream Pressure",
        value: `${formatNumber(facts.scope.avgUpstreamPressurePsi, 1)} psi avg`,
        note: "Used to confirm supply-side pressure stability while water is being consumed.",
      },
      {
        section: "Sensors" as const,
        name: "Downstream Pressure",
        value: `${formatNumber(facts.scope.avgDownstreamPressurePsi, 1)} psi avg`,
        note: `Average pressure spread is ${formatNumber(facts.pressureSpread, 1)} psi between upstream and downstream readings.`,
      },
      {
        section: "Sensors" as const,
        name: "Device Mode",
        value: data.dashboard.todayDeviceState,
        note: `${facts.scope.modeSummary.engagedDays} engaged days and ${facts.scope.modeSummary.bypassedDays} bypassed days in this report period.`,
      },
      {
        section: "Sensors" as const,
        name: "Telemetry Coverage",
        value: `${Math.round(facts.scope.avgTelemetryPct)}%`,
        note:
          dashboardMeta.sourceFiles > 0
            ? `${dashboardMeta.readingCount.toLocaleString()} readings analyzed from ${dashboardMeta.sourceFiles} source files.`
            : `${dashboardMeta.readingCount.toLocaleString()} readings analyzed; source file count is not exposed by the hosted data tables.`,
      },
    ];

    const alertRows = data.alerts.allAlerts.slice(0, 20).map((alert) => ({
      section: "Alerts" as const,
      name: alert.title,
      value: alert.status,
      note: `${alert.time} - ${alert.action}`,
    }));

    const chartRows = [
      {
        section: "Charts" as const,
        name: "Mode Impact",
        value: data.analytics.analyticsMeta.confidenceHeadline,
        note: data.analytics.analyticsMeta.confidenceCaption,
      },
      {
        section: "Charts" as const,
        name: "Pressure Result",
        value: data.analytics.pressureResult,
        note: data.analytics.maintenanceSignal.title,
      },
      {
        section: "Charts" as const,
        name: "Telemetry Completeness",
        value: `${dashboardMeta.telemetryCompleteness}%`,
        note: `${dashboardMeta.readingCount.toLocaleString()} readings analyzed`,
      },
    ];

    const noteRows = [
      {
        section: "Financial Impact" as const,
        name: "Estimated Report-Period Water Cost",
        value: formatMoney(facts.periodCost),
        note: `${formatNumber(facts.scope.totalVolumeGal)} gal x ${formatMoney(blendedWaterRatePerThousandGal)} per 1,000 gal. Client tariff pending.`,
      },
      {
        section: "Financial Impact" as const,
        name: "Latest Day Cost Movement",
        value: facts.costDeltaLabel,
        note: `Latest complete day is ${formatMoney(facts.latestDayCost)} vs. this period's average day of ${formatMoney(facts.avgDayCost)}. Against the full-data baseline, it is ${facts.baselineDeltaLabel}.`,
      },
      {
        section: "Notes" as const,
        name: "Operator Review",
        value: data.alerts.activeAlerts.length ? "Action required" : "No active alert action required",
        note: data.alerts.activeAlerts[0]?.action ?? "Continue routine monitoring.",
      },
      {
        section: "Notes" as const,
        name: "Data Source",
        value: data.source,
        note: "Dashboard generated from Supabase summary tables.",
      },
    ];

    return [
      {
        section: "Overview" as const,
        name: "Title",
        value: reportTitle,
        note: dashboardMeta.propertyName,
      },
      {
        section: "Overview" as const,
        name: "Data Window",
        value: `${facts.scope.startLabel} to ${facts.scope.endLabel}`,
        note: `${facts.scope.daysObserved} complete days in this report`,
      },
      {
        section: "Overview" as const,
        name: "Latest Reading",
        value: dashboardMeta.latestReadingLabel,
        note: `Source: ${data.source}`,
      },
      ...(selectedInclude.metrics ? [...consumptionRows, ...sensorRows] : []),
      ...(selectedInclude.alerts ? alertRows : []),
      ...(selectedInclude.charts ? chartRows : []),
      ...(selectedInclude.notes ? noteRows : []),
    ];
  };

  const downloadBlob = (filename: string, mimeType: string, content: BlobPart) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const csvEscape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;

  const htmlEscape = (value: string | number) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  const downloadCsv = (filename: string, rows: ReportRow[]) => {
    const csv = [
      ["Section", "Name", "Value", "Note"].map(csvEscape).join(","),
      ...rows.map((row) => [row.section, row.name, row.value, row.note].map(csvEscape).join(",")),
    ].join("\n");

    downloadBlob(filename, "text/csv;charset=utf-8", csv);
  };

  const downloadExcel = (filename: string, rows: ReportRow[]) => {
    const htmlRows = rows
      .map(
        (row) =>
          `<tr><td>${htmlEscape(row.section)}</td><td>${htmlEscape(row.name)}</td><td>${htmlEscape(row.value)}</td><td>${htmlEscape(row.note)}</td></tr>`,
      )
      .join("");
    const html = `
      <html>
        <head><meta charset="utf-8" /></head>
        <body>
          <table>
            <thead><tr><th>Section</th><th>Name</th><th>Value</th><th>Note</th></tr></thead>
            <tbody>${htmlRows}</tbody>
          </table>
        </body>
      </html>
    `;

    downloadBlob(filename, "application/vnd.ms-excel;charset=utf-8", html);
  };

  const downloadPdf = async (filename: string, reportTitle: string, rows: ReportRow[], selectedInclude: IncludeOptions) => {
    const { jsPDF } = await import("jspdf");
    const facts = buildReportFacts(reportTitle);
    const isAlertsReport = reportTitle === "Alerts Report";
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;
    const navy = [7, 32, 49] as const;
    const surface = [243, 248, 250] as const;
    const ink = [15, 23, 42] as const;
    const muted = [91, 108, 132] as const;
    const cyan = [6, 182, 212] as const;
    const green = [34, 197, 94] as const;
    const amber = [245, 158, 11] as const;
    let y = 18;

    const setFill = (color: readonly [number, number, number]) => {
      pdf.setFillColor(color[0], color[1], color[2]);
    };

    const drawContinuationHeader = () => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(...ink);
      pdf.text(reportTitle, margin, 15);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(...muted);
      pdf.text(`${data.dashboardMeta.propertyName} | ${facts.scope.startLabel} to ${facts.scope.endLabel}`, margin, 21);
      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin, 26, pageWidth - margin, 26);
    };

    const addFooter = () => {
      const pageNumber = pdf.getNumberOfPages();
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(110, 126, 145);
      pdf.text(`Hydroficient Operator Report - Page ${pageNumber}`, margin, pageHeight - 10);
    };

    const addPageIfNeeded = (neededHeight: number) => {
      if (y + neededHeight <= pageHeight - 18) return;
      addFooter();
      pdf.addPage();
      drawContinuationHeader();
      y = 38;
    };

    const sectionTitle = (title: string) => {
      addPageIfNeeded(16);
      y += 5;
      pdf.setFillColor(...cyan);
      pdf.roundedRect(margin, y - 3, 8, 3, 1.5, 1.5, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(...ink);
      pdf.text(title, margin + 12, y);
      y += 9;
    };

    const drawInsightCard = (
      x: number,
      cardY: number,
      width: number,
      height: number,
      label: string,
      value: string,
      note: string,
      accent: readonly [number, number, number] = cyan,
    ) => {
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(220, 232, 238);
      pdf.roundedRect(x, cardY, width, height, 3, 3, "FD");
      setFill(accent);
      pdf.roundedRect(x, cardY, 2.2, height, 1.5, 1.5, "F");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(...muted);
      pdf.text(label.toUpperCase(), x + 5, cardY + 7);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(value.length > 20 ? 10.5 : 13.5);
      pdf.setTextColor(...ink);
      pdf.text(value, x + 5, cardY + 17);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(...muted);
      pdf.text(pdf.splitTextToSize(note, width - 10).slice(0, 2), x + 5, cardY + 24);
    };

    const drawProgress = (x: number, barY: number, width: number, label: string, value: number, max: number, color: readonly [number, number, number]) => {
      const pct = Math.max(0, Math.min(1, max ? value / max : 0));
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(...muted);
      pdf.text(label, x, barY - 2);
      pdf.setFillColor(226, 235, 240);
      pdf.roundedRect(x, barY, width, 4, 2, 2, "F");
      setFill(color);
      pdf.roundedRect(x, barY, width * pct, 4, 2, 2, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...ink);
      pdf.text(`${Math.round(pct * 100)}%`, x + width + 5, barY + 3.5);
    };

    const drawHourlyBars = (
      profile: { hour: string; value: number; offHours: boolean }[],
      x: number,
      chartY: number,
      width: number,
      height: number,
    ) => {
      const values = profile.map((row) => row.value);
      const maxValue = Math.max(...values, 1);
      const gap = 1.2;
      const barWidth = (width - gap * 23) / 24;
      profile.forEach((row, index) => {
        const barHeight = Math.max(2, (row.value / maxValue) * height);
        pdf.setFillColor(row.offHours ? 96 : 6, row.offHours ? 165 : 182, row.offHours ? 250 : 212);
        pdf.roundedRect(x + index * (barWidth + gap), chartY + height - barHeight, barWidth, barHeight, 1, 1, "F");
      });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(...muted);
      pdf.text("00:00", x, chartY + height + 7);
      pdf.text("12:00", x + width / 2 - 5, chartY + height + 7);
      pdf.text("23:00", x + width - 13, chartY + height + 7);
    };

    const drawModeRibbon = (x: number, ribbonY: number, width: number) => {
      const history = data.dashboard.deviceModeHistory.slice(-facts.scope.modeSummary.totalDays);
      const segmentWidth = width / Math.max(history.length, 1);
      history.forEach((day, index) => {
        const color = day.state === "Engaged" ? green : amber;
        setFill(color);
        pdf.rect(x + index * segmentWidth, ribbonY, Math.max(segmentWidth - 0.5, 1), 7, "F");
      });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(...muted);
      pdf.text(facts.scope.startLabel, x, ribbonY + 14);
      pdf.text(facts.scope.endLabel, x + width - 27, ribbonY + 14);
      pdf.setFillColor(...green);
      pdf.circle(x, ribbonY + 22, 1.8, "F");
      pdf.setTextColor(...ink);
      pdf.text(`${facts.scope.modeSummary.engagedDays} engaged days`, x + 5, ribbonY + 23);
      pdf.setFillColor(...amber);
      pdf.circle(x + 54, ribbonY + 22, 1.8, "F");
      pdf.text(`${facts.scope.modeSummary.bypassedDays} bypassed days`, x + 59, ribbonY + 23);
    };

    const drawRows = (section: ReportRow["section"], limit = 10) => {
      const sectionRows = rows.filter((row) => row.section === section);
      if (!sectionRows.length) return;

      sectionTitle(section);
      sectionRows.slice(0, limit).forEach((row) => {
        const wrapped = pdf.splitTextToSize(row.note, contentWidth - 62);
        const rowHeight = Math.max(15, wrapped.length * 4 + 10);
        addPageIfNeeded(rowHeight);

        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(224, 234, 240);
        pdf.roundedRect(margin, y - 4, contentWidth, rowHeight, 2.5, 2.5, "FD");
        if (section === "Alerts") {
          const alertColor = row.value === "Active" ? amber : green;
          setFill(alertColor);
          pdf.circle(margin + 5, y + 2, 2, "F");
        }
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        pdf.setTextColor(...ink);
        pdf.text(row.name, margin + (section === "Alerts" ? 10 : 5), y + 2);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(section === "Alerts" && row.value === "Active" ? 180 : 7, section === "Alerts" && row.value === "Active" ? 83 : 118, 9);
        pdf.text(pdf.splitTextToSize(row.value, 38).slice(0, 1), margin + contentWidth - 43, y + 2);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(...muted);
        pdf.text(wrapped, margin + (section === "Alerts" ? 10 : 5), y + 9);
        y += rowHeight + 4;
      });
    };

    pdf.setFillColor(...navy);
    pdf.rect(0, 0, pageWidth, 56, "F");
    pdf.setFillColor(...cyan);
    pdf.roundedRect(margin, 12, 11, 11, 3, 3, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(...navy);
    pdf.text("H", margin + 3.3, 19.6);
    pdf.setFontSize(20);
    pdf.setTextColor(255, 255, 255);
    pdf.text(reportTitle, margin, 33);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(191, 219, 254);
    pdf.text(data.dashboardMeta.propertyName, margin, 42);
    pdf.text(`${facts.scope.startLabel} to ${facts.scope.endLabel}`, margin, 49);
    pdf.setFillColor(226, 252, 255);
    pdf.roundedRect(pageWidth - margin - 46, 14, 46, 11, 5.5, 5.5, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(8, 107, 137);
    pdf.text("Client-ready draft", pageWidth - margin - 40, 21.5);
    y = 70;

    const overviewRows = rows.filter((row) => row.section === "Overview");
    const consumptionRows = rows.filter((row) => row.section === "Consumption");
    const sensorRows = rows.filter((row) => row.section === "Sensors");

    sectionTitle("Executive Summary");
    const summaryText = [
      `${data.dashboardMeta.propertyName} has ${facts.scope.daysObserved} complete days in this ${facts.scope.label.toLowerCase()} report.`,
      `Total consumption was ${formatNumber(facts.scope.totalVolumeGal)} gallons, averaging ${formatNumber(facts.scope.avgDailyVolumeGal)} gal/day.`,
      `The latest complete day used ${formatNumber(facts.scope.latestDayVolumeGal)} gallons and is ${facts.costDeltaLabel.toLowerCase()}.`,
      `Telemetry averaged ${Math.round(facts.scope.avgTelemetryPct)}%, so the report is suitable for operator review. Final billing comparisons should use the client's actual tariff sheet.`,
    ];
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    pdf.setTextColor(...muted);
    pdf.text(pdf.splitTextToSize(summaryText.join(" "), contentWidth), margin, y);
    y += 24;

    if (selectedInclude.metrics && consumptionRows.length) {
      addPageIfNeeded(66);
      const gap = 4;
      const cardWidth = (contentWidth - gap * 2) / 3;
      consumptionRows.slice(0, 3).forEach((row, index) => {
        const x = margin + index * (cardWidth + gap);
        drawInsightCard(x, y, cardWidth, 31, row.name, row.value, row.note, index === 2 ? amber : cyan);
      });
      y += 39;

      pdf.setFillColor(...surface);
      pdf.setDrawColor(220, 232, 238);
      pdf.roundedRect(margin, y, contentWidth, 55, 3, 3, "FD");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(...ink);
      pdf.text("Sensor Evidence For Consumption", margin + 5, y + 9);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(...muted);
      pdf.text(
        pdf.splitTextToSize(
          "Consumption is not judged from one number only. The report combines volume movement, current flow, pressure behavior, device mode, and telemetry coverage so an operator can see whether usage is normal, explainable, or worth investigating.",
          contentWidth - 10,
        ),
        margin + 5,
        y + 17,
      );
      drawProgress(margin + 5, y + 36, 55, "Telemetry", facts.scope.avgTelemetryPct, 100, green);
      drawProgress(margin + 84, y + 36, 55, "Stability", data.dashboardMeta.stabilityIndex, 100, cyan);
      drawProgress(margin + 163, y + 36, 20, "Pressure", Math.max(0, 100 - Math.abs(facts.pressureSpread) * 2), 100, facts.pressureSpread > 18 ? amber : green);
      y += 62;
    }

    if (overviewRows.length) {
      sectionTitle("Report Details");
      overviewRows.forEach((row) => {
        addPageIfNeeded(13);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        pdf.setTextColor(71, 85, 105);
        pdf.text(row.name, margin, y);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(15, 23, 42);
        pdf.text(pdf.splitTextToSize(`${row.value} - ${row.note}`, contentWidth - 52), margin + 52, y);
        y += 8;
      });
    }

    if (selectedInclude.metrics && sensorRows.length) {
      drawRows("Sensors", 8);
    }

    if (selectedInclude.charts) {
      sectionTitle("Consumption Pattern");
      addPageIfNeeded(70);
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(220, 232, 238);
      pdf.roundedRect(margin, y, contentWidth, 62, 3, 3, "FD");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(...ink);
      pdf.text("Average hourly consumption profile", margin + 5, y + 9);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(...muted);
      pdf.text("Off-hours are blue; operating hours are cyan. Tall off-hours bars point to possible continuous use.", margin + 5, y + 16);
      drawHourlyBars(facts.scope.hourlyProfile, margin + 7, y + 23, contentWidth - 14, 25);
      y += 69;

      sectionTitle("Mode Timeline");
      addPageIfNeeded(44);
      if (facts.scope.modeSummary.engagedDays === facts.scope.modeSummary.totalDays || facts.scope.modeSummary.bypassedDays === facts.scope.modeSummary.totalDays) {
        const modeLabel = facts.scope.modeSummary.engagedDays ? "Device engaged for full report period" : "Device bypassed for full report period";
        pdf.setFillColor(240, 253, 244);
        pdf.setDrawColor(187, 247, 208);
        pdf.roundedRect(margin, y, contentWidth, 22, 3, 3, "FD");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(22, 101, 52);
        pdf.text(modeLabel, margin + 5, y + 9);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.text("A segmented timeline is hidden because every complete day had the same mode state.", margin + 5, y + 16);
        y += 30;
      } else {
        drawModeRibbon(margin, y, contentWidth);
        y += 34;
      }
      drawRows("Charts", 8);
    }

    if (selectedInclude.notes) {
      sectionTitle("Dollar Impact Explanation");
      addPageIfNeeded(38);
      pdf.setFillColor(255, 251, 235);
      pdf.setDrawColor(253, 230, 138);
      pdf.roundedRect(margin, y, contentWidth, 32, 3, 3, "FD");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(120, 53, 15);
      pdf.text(`${facts.costDelta >= 0 ? "Increase" : "Reduction"} vs. period average: ${facts.costDeltaLabel}`, margin + 5, y + 9);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(120, 53, 15);
      pdf.text(
        pdf.splitTextToSize(
          `This uses ${formatMoney(blendedWaterRatePerThousandGal)} per 1,000 gallons as a planning rate. Formula: (${formatNumber(facts.scope.latestDayVolumeGal)} gal latest day - ${formatNumber(facts.scope.avgDailyVolumeGal)} gal average day) x ${formatRate(facts.costPerGal)} per gallon. Client tariff pending.`,
          contentWidth - 10,
        ),
        margin + 5,
        y + 17,
      );
      y += 38;
      drawRows("Financial Impact", 8);
      drawRows("Notes", 8);
    }

    if (selectedInclude.alerts) {
      const alertRows = rows.filter((row) => row.section === "Alerts");
      if (alertRows.length) {
        sectionTitle("Alert Summary");
        addPageIfNeeded(26);
        const activeCount = data.alerts.activeAlerts.length;
        const visibleAlertCount = isAlertsReport ? Math.min(alertRows.length, 12) : Math.min(alertRows.length, 5);
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(220, 232, 238);
        pdf.roundedRect(margin, y, contentWidth, 22, 3, 3, "FD");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(...ink);
        pdf.text(`${activeCount} active alerts | ${alertRows.length} total generated alerts`, margin + 5, y + 8);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(...muted);
        pdf.text(
          isAlertsReport
            ? "Detailed alert report: showing the most recent generated alerts."
            : `Summary report: showing top ${visibleAlertCount} alerts only. Use Alerts Report for the full review list.`,
          margin + 5,
          y + 16,
        );
        y += 29;
      }
      drawRows("Alerts", isAlertsReport ? 12 : 5);
    }

    addFooter();

    pdf.save(filename);
  };

  const downloadReport = async (
    reportTitle: string,
    selectedFormat: "PDF" | "Excel" | "CSV",
    selectedInclude: IncludeOptions = defaultInclude,
  ) => {
    const rows = reportRows(reportTitle, selectedInclude);
    const baseName = `${slugify(data.dashboardMeta.propertyName)}-${slugify(reportTitle)}`;

    if (selectedFormat === "CSV") {
      downloadCsv(`${baseName}.csv`, rows);
    } else if (selectedFormat === "Excel") {
      downloadExcel(`${baseName}.xls`, rows);
    } else {
      await downloadPdf(`${baseName}.pdf`, reportTitle, rows, selectedInclude);
    }
  };

  const downloadRecent = async (report: RecentReport, key: string) => {
    await downloadReport(report.title, report.format, defaultInclude);
    setDownloadedReports((prev) => new Set(prev).add(key));
  };

  const openModal = (report: ReportType) => {
    setOpenReport(report);
    setFormat("PDF");
    setJustDownloaded(false);
  };

  const toggleInclude = (key: keyof typeof include) => {
    setInclude((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <Reveal>
        <section className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[var(--bg-surface)] p-6 shadow-lg shadow-black/20">
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(14,165,233,0.24),transparent_34%)]"
            style={{ animation: "hero-glow 20s ease-in-out infinite" }}
          />
          <div className="relative">
            <p className="text-sm font-semibold text-[var(--accent)]">Home / Reports</p>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-[var(--text-primary)] md:text-5xl">
              Reports
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
              Generate and export summaries for operators, ownership, and ESG reviews —
              pre-built or fully custom.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="rounded-xl bg-white/[0.03] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
                  Reports This Month
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums text-[var(--text-primary)]">
                  12
                </p>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
                  Next Scheduled
                </p>
                <p className="mt-2 text-lg font-bold tracking-tight text-[var(--text-primary)]">
                  Weekly · Mon 7am
                </p>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
                  Last Generated
                </p>
                <p className="mt-2 text-lg font-bold tracking-tight text-[var(--text-primary)]">
                  Today · 07:02
                </p>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal delay={80}>
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">Pre-built Reports</h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {reportTypes.map((report) => {
              const Icon = report.icon;

              return (
                <div key={report.id} className={cardClass}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="rounded-xl bg-[color:rgba(14,165,233,0.12)] p-2.5 text-[var(--accent)]">
                      <Icon size={20} strokeWidth={1.75} />
                    </div>
                    <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-[var(--text-tertiary)]">
                      {report.defaultRange}
                    </span>
                  </div>

                  <h3 className="mt-4 text-lg font-bold tracking-tight">{report.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {report.description}
                  </p>

                  <button
                    onClick={() => openModal(report)}
                    className="mt-5 w-full rounded-xl border border-[var(--accent)] bg-[color:rgba(14,165,233,0.1)] py-2.5 text-sm font-semibold text-[var(--accent)] transition-colors duration-150 hover:bg-[color:rgba(14,165,233,0.18)]"
                  >
                    Generate
                  </button>
                </div>
              );
            })}

            <div className={`${cardClass} flex flex-col justify-between border-dashed`}>
              <div>
                <div className="rounded-xl bg-white/[0.04] p-2.5 text-[var(--text-secondary)] w-fit">
                  <SlidersHorizontal size={20} strokeWidth={1.75} />
                </div>
                <h3 className="mt-4 text-lg font-bold tracking-tight">Custom Report</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
                  Choose your own date range, metrics, and format.
                </p>
              </div>

              <button
                onClick={() =>
                  openModal({
                    id: "custom",
                    title: "Custom Report",
                    description: "Choose your own date range, metrics, and format.",
                    icon: SlidersHorizontal,
                    defaultRange: "Custom",
                  })
                }
                className="mt-5 w-full rounded-xl bg-white/[0.06] py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors duration-150 hover:bg-white/[0.1]"
              >
                Build Report
              </button>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal delay={160}>
        <section className={cardClass}>
          <h2 className="text-xl font-bold tracking-tight">Recent Reports</h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
            Previously generated reports, ready to re-download.
          </p>

          <div className="mt-5 grid gap-2">
            {recentReports.map((report) => {
              const key = `${report.title}-${report.generated}`;
              const isDownloaded = downloadedReports.has(key);

              return (
                <div
                  key={key}
                  className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{report.title}</p>
                      <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-xs font-semibold text-[var(--text-tertiary)]">
                        {report.format}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                      {report.range} · Generated {report.generated}
                    </p>
                  </div>
                  <button
                    onClick={() => downloadRecent(report, key)}
                    disabled={isDownloaded}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-150 ${
                      isDownloaded
                        ? "text-[var(--success)]"
                        : "text-[var(--text-tertiary)] hover:bg-white/[0.05] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {isDownloaded ? (
                      <>
                        <CheckCircle2 size={15} strokeWidth={1.75} />
                        Downloaded
                      </>
                    ) : (
                      <>
                        <Download size={15} strokeWidth={1.75} />
                        Download
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </Reveal>

      {openReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
                  Export
                </p>
                <h3 className="mt-1 text-xl font-bold tracking-tight">{openReport.title}</h3>
              </div>
              <button
                onClick={() => setOpenReport(null)}
                className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>

            {justDownloaded ? (
              <div className="mt-6 flex flex-col items-center gap-3 py-6 text-center">
                <div className="rounded-full bg-[color:var(--success-soft)] p-3 text-[var(--success)]">
                  <CheckCircle2 size={28} strokeWidth={1.75} />
                </div>
                <p className="font-semibold text-[var(--text-primary)]">Report ready</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {openReport.title} ({format}) has been generated.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                    Format
                  </p>
                  <div className="mt-2 flex gap-2">
                    {(["PDF", "Excel", "CSV"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFormat(f)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors duration-150 ${
                          format === f
                            ? "bg-[color:rgba(14,165,233,0.14)] text-[var(--accent)]"
                            : "bg-white/[0.04] text-[var(--text-secondary)] hover:bg-white/[0.07]"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                    Date Range
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-primary)]">{openReport.defaultRange}</p>
                </div>

                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                    Include
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(
                      [
                        ["metrics", "Sensor Metrics"],
                        ["alerts", "Alerts"],
                        ["charts", "Visual Analysis"],
                        ["notes", "Cost Notes"],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => toggleInclude(key)}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                          include[key]
                            ? "bg-white/[0.06] text-[var(--text-primary)]"
                            : "bg-white/[0.02] text-[var(--text-tertiary)]"
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded border ${
                            include[key]
                              ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg-base)]"
                              : "border-white/[0.2]"
                          }`}
                        >
                          {include[key] && <CheckCircle2 size={12} strokeWidth={3} />}
                        </span>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={async () => {
                    await downloadReport(openReport.title, format, include);
                    setJustDownloaded(true);
                  }}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--bg-base)] transition-colors duration-150 hover:opacity-90"
                >
                  <Download size={16} strokeWidth={2} />
                  Download
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
