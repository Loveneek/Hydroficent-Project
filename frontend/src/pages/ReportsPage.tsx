import { useState } from "react";
import { CheckCircle2, Download, SlidersHorizontal, X } from "lucide-react";
import { Reveal } from "../components/Reveal";
import { cardClass } from "../theme";
import type { RecentReport, ReportType } from "../types";
import type { DashboardData } from "../data/buildDashboardData";

type ReportsPageProps = {
  data: DashboardData;
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

  const reportRows = (reportTitle: string) => {
    const { dashboardMeta } = data;
    const currentKpis = data.dashboard.kpis.map((kpi) => ({
      section: "Metric",
      name: kpi.label,
      value: `${kpi.value}${kpi.unit ? ` ${kpi.unit}` : ""}`,
      note: kpi.hint ?? kpi.severity,
    }));

    const alertRows = data.alerts.allAlerts.slice(0, 20).map((alert) => ({
      section: "Alert",
      name: alert.title,
      value: alert.status,
      note: `${alert.time} - ${alert.action}`,
    }));

    const analyticsRows = [
      {
        section: "Analytics",
        name: "Mode Impact",
        value: data.analytics.analyticsMeta.confidenceHeadline,
        note: data.analytics.analyticsMeta.confidenceCaption,
      },
      {
        section: "Analytics",
        name: "Pressure Result",
        value: data.analytics.pressureResult,
        note: data.analytics.maintenanceSignal.title,
      },
      {
        section: "Analytics",
        name: "Telemetry Completeness",
        value: `${dashboardMeta.telemetryCompleteness}%`,
        note: `${dashboardMeta.readingCount.toLocaleString()} readings analyzed`,
      },
    ];

    return [
      {
        section: "Report",
        name: "Title",
        value: reportTitle,
        note: dashboardMeta.propertyName,
      },
      {
        section: "Report",
        name: "Data Window",
        value: dashboardMeta.dataWindowLabel,
        note: `${dashboardMeta.daysObserved} observed days`,
      },
      {
        section: "Report",
        name: "Latest Reading",
        value: dashboardMeta.latestReadingLabel,
        note: `Source: ${data.source}`,
      },
      ...currentKpis,
      ...analyticsRows,
      ...alertRows,
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

  const downloadCsv = (filename: string, rows: ReturnType<typeof reportRows>) => {
    const csv = [
      ["Section", "Name", "Value", "Note"].map(csvEscape).join(","),
      ...rows.map((row) => [row.section, row.name, row.value, row.note].map(csvEscape).join(",")),
    ].join("\n");

    downloadBlob(filename, "text/csv;charset=utf-8", csv);
  };

  const downloadExcel = (filename: string, rows: ReturnType<typeof reportRows>) => {
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

  const downloadPdf = async (filename: string, reportTitle: string, rows: ReturnType<typeof reportRows>) => {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    let y = 18;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(reportTitle, 14, y);

    y += 8;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(data.dashboardMeta.propertyName, 14, y);

    y += 8;
    rows.forEach((row) => {
      if (y > 276) {
        pdf.addPage();
        y = 18;
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text(`${row.section}: ${row.name}`, 14, y);
      y += 5;

      pdf.setFont("helvetica", "normal");
      const wrapped = pdf.splitTextToSize(`${row.value} - ${row.note}`, pageWidth - 28);
      pdf.text(wrapped, 14, y);
      y += wrapped.length * 5 + 3;
    });

    pdf.save(filename);
  };

  const downloadReport = async (reportTitle: string, selectedFormat: "PDF" | "Excel" | "CSV") => {
    const rows = reportRows(reportTitle);
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
    await downloadReport(report.title, report.format);
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
                    await downloadReport(openReport.title, format);
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
