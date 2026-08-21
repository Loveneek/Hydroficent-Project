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
  section: "Overview" | "Metrics" | "Alerts" | "Charts" | "Notes";
  name: string;
  value: string;
  note: string;
};

export function ReportsPage({ data }: ReportsPageProps) {
  const [openReport, setOpenReport] = useState<ReportType | null>(null);
  const [format, setFormat] = useState<"PDF" | "Excel" | "CSV">("PDF");
  const [include, setInclude] = useState({ metrics: true, alerts: true, charts: true, notes: false });
  const [justDownloaded, setJustDownloaded] = useState(false);
  const [downloadedReports, setDownloadedReports] = useState<Set<string>>(new Set());
  const { recentReports, reportTypes } = data.reports;

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const defaultInclude: IncludeOptions = { metrics: true, alerts: true, charts: true, notes: true };

  const reportRows = (reportTitle: string, selectedInclude: IncludeOptions): ReportRow[] => {
    const { dashboardMeta } = data;
    const currentKpis = data.dashboard.kpis.map((kpi) => ({
      section: "Metrics" as const,
      name: kpi.label,
      value: `${kpi.value}${kpi.unit ? ` ${kpi.unit}` : ""}`,
      note: kpi.hint ?? kpi.severity,
    }));

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
        value: dashboardMeta.dataWindowLabel,
        note: `${dashboardMeta.daysObserved} observed days`,
      },
      {
        section: "Overview" as const,
        name: "Latest Reading",
        value: dashboardMeta.latestReadingLabel,
        note: `Source: ${data.source}`,
      },
      ...(selectedInclude.metrics ? currentKpis : []),
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

  const downloadPdf = async (filename: string, reportTitle: string, rows: ReportRow[]) => {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;
    let y = 18;

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
      y = 18;
    };

    const sectionTitle = (title: string) => {
      addPageIfNeeded(16);
      y += 4;
      pdf.setDrawColor(15, 118, 150);
      pdf.setLineWidth(0.8);
      pdf.line(margin, y, margin + 8, y);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(15, 23, 42);
      pdf.text(title, margin + 11, y + 1);
      y += 8;
    };

    const drawMetricCard = (x: number, cardY: number, width: number, label: string, value: string, note: string) => {
      pdf.setFillColor(241, 248, 251);
      pdf.setDrawColor(205, 225, 233);
      pdf.roundedRect(x, cardY, width, 27, 3, 3, "FD");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(87, 105, 124);
      pdf.text(label.toUpperCase(), x + 4, cardY + 7);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(7, 89, 133);
      pdf.text(value, x + 4, cardY + 16);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(100, 116, 139);
      pdf.text(pdf.splitTextToSize(note, width - 8).slice(0, 1), x + 4, cardY + 23);
    };

    pdf.setFillColor(8, 47, 73);
    pdf.rect(0, 0, pageWidth, 44, "F");
    pdf.setFillColor(14, 165, 233);
    pdf.circle(margin + 4, 14, 3, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(255, 255, 255);
    pdf.text(reportTitle, margin, 22);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(191, 219, 254);
    pdf.text(data.dashboardMeta.propertyName, margin, 31);
    pdf.text(data.dashboardMeta.dataWindowLabel, margin, 38);
    y = 58;

    const overviewRows = rows.filter((row) => row.section === "Overview");
    const metricRows = rows.filter((row) => row.section === "Metrics");
    const remainingSections = ["Alerts", "Charts", "Notes"] as const;

    sectionTitle("Executive Summary");
    const summaryText = [
      `${data.dashboardMeta.propertyName} has ${data.dashboardMeta.daysObserved} observed days in this dashboard period.`,
      `Latest reading: ${data.dashboardMeta.latestReadingLabel}.`,
      `Water stability index: ${data.dashboardMeta.stabilityIndex}%. Telemetry completeness: ${data.dashboardMeta.telemetryCompleteness}%.`,
    ];
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    pdf.setTextColor(51, 65, 85);
    pdf.text(pdf.splitTextToSize(summaryText.join(" "), contentWidth), margin, y);
    y += 19;

    if (metricRows.length) {
      addPageIfNeeded(40);
      const gap = 4;
      const cardWidth = (contentWidth - gap) / 2;
      metricRows.slice(0, 4).forEach((row, index) => {
        const x = margin + (index % 2) * (cardWidth + gap);
        const cardY = y + Math.floor(index / 2) * 31;
        drawMetricCard(x, cardY, cardWidth, row.name, row.value, row.note);
      });
      y += Math.ceil(Math.min(metricRows.length, 4) / 2) * 31 + 2;
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

    remainingSections.forEach((section) => {
      const sectionRows = rows.filter((row) => row.section === section);
      if (!sectionRows.length) return;

      sectionTitle(section);
      sectionRows.slice(0, section === "Alerts" ? 12 : 8).forEach((row) => {
        const wrapped = pdf.splitTextToSize(row.note, contentWidth - 62);
        const rowHeight = Math.max(14, wrapped.length * 4 + 8);
        addPageIfNeeded(rowHeight);

        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(226, 232, 240);
        pdf.roundedRect(margin, y - 4, contentWidth, rowHeight, 2, 2, "FD");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        pdf.setTextColor(15, 23, 42);
        pdf.text(row.name, margin + 4, y + 2);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(section === "Alerts" && row.value === "Active" ? 180 : 15, section === "Alerts" && row.value === "Active" ? 83 : 118, 9);
        pdf.text(row.value, margin + contentWidth - 32, y + 2);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(71, 85, 105);
        pdf.text(wrapped, margin + 4, y + 8);
        y += rowHeight + 4;
      });
    });

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
      await downloadPdf(`${baseName}.pdf`, reportTitle, rows);
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
                        ["metrics", "Metrics"],
                        ["alerts", "Alerts"],
                        ["charts", "Charts"],
                        ["notes", "Notes"],
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
