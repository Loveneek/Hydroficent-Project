import { useState } from "react";
import { CheckCircle2, History } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertDetailModal } from "../components/AlertDetailModal";
import { DarkTooltip } from "../components/DarkTooltip";
import { Reveal } from "../components/Reveal";
import { cardClass, severity } from "../theme";
import type { AlertRecord } from "../types";
import type { DashboardData } from "../data/buildDashboardData";

type AlertsPageProps = {
  data: DashboardData;
};

export function AlertsPage({ data }: AlertsPageProps) {
  const [severityFilter, setSeverityFilter] = useState<
    "All Severities" | "Critical" | "Warning" | "Info"
  >("All Severities");
  const [statusFilter, setStatusFilter] = useState<"Active" | "Resolved" | "All">("All");
  const [openAlert, setOpenAlert] = useState<AlertRecord | null>(null);
  const { dashboardMeta } = data;
  const { events } = data.dashboard;
  const { alertFrequency, allAlerts, alertsKpis, severityBreakdown } = data.alerts;

  const filteredAlerts = allAlerts.filter((alert) => {
    const matchesSeverity =
      severityFilter === "All Severities" || alert.severity === severityFilter.toLowerCase();
    const matchesStatus = statusFilter === "All" || alert.status === statusFilter;
    return matchesSeverity && matchesStatus;
  });

  return (
    <>
      <Reveal>
        <section className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[var(--bg-surface)] p-6 shadow-lg shadow-black/20">
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(14,165,233,0.24),transparent_34%)]"
            style={{ animation: "hero-glow 20s ease-in-out infinite" }}
          />
          <div className="relative">
            <p className="text-sm font-semibold text-[var(--accent)]">Home / Alerts</p>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-[var(--text-primary)] md:text-5xl">
              Alerts &amp; Activity
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
              Everything that needs review, plus a full record of what happened and when.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              {alertsKpis.map((kpi) => {
                const Icon = kpi.icon;
                const style = severity[kpi.severity];

                return (
                  <div key={kpi.label} className="rounded-xl bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
                        {kpi.label}
                      </p>
                      <Icon className={style.text} size={16} strokeWidth={1.75} />
                    </div>
                    <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums text-[var(--text-primary)]">
                      {kpi.value}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-tertiary)]">{kpi.caption}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal delay={80}>
        <section className={cardClass}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              Filter
            </span>
            <div className="flex flex-wrap gap-2">
              {(["All Severities", "Critical", "Warning", "Info"] as const).map((label) => (
                <button
                  key={label}
                  onClick={() => setSeverityFilter(label)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                    severityFilter === label
                      ? "bg-[color:rgba(14,165,233,0.12)] text-[var(--accent)]"
                      : "bg-white/[0.04] text-[var(--text-secondary)] hover:bg-white/[0.07]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="h-4 w-px bg-white/[0.08]" />
            <div className="flex flex-wrap gap-2">
              {(["Active", "Resolved", "All"] as const).map((label) => (
                <button
                  key={label}
                  onClick={() => setStatusFilter(label)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                    statusFilter === label
                      ? "bg-[color:rgba(14,165,233,0.12)] text-[var(--accent)]"
                      : "bg-white/[0.04] text-[var(--text-secondary)] hover:bg-white/[0.07]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {filteredAlerts.length === 0 && (
              <p className="rounded-xl border border-dashed border-white/[0.08] p-6 text-center text-sm text-[var(--text-tertiary)]">
                No alerts match these filters.
              </p>
            )}
            {filteredAlerts.map((alert) => {
              const style = severity[alert.severity];
              const isResolved = alert.status === "Resolved";

              return (
                <div
                  key={alert.id}
                  className={`grid grid-cols-[1fr_auto] items-center gap-4 rounded-xl border border-white/[0.06] p-4 transition-colors duration-150 ${
                    isResolved ? "bg-white/[0.015]" : "bg-white/[0.03]"
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {!isResolved && (
                        <span className="relative flex h-2.5 w-2.5">
                          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${style.fill} opacity-50`} />
                          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${style.fill}`} />
                        </span>
                      )}
                      {isResolved && <CheckCircle2 className="text-[var(--text-tertiary)]" size={15} strokeWidth={2} />}
                      <p className={`font-semibold ${isResolved ? "text-[var(--text-secondary)]" : "text-[var(--text-primary)]"}`}>
                        {alert.title}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${style.bg} ${style.text}`}>
                        {alert.time}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          isResolved
                            ? "bg-white/[0.05] text-[var(--text-tertiary)]"
                            : "bg-[color:var(--warning-soft)] text-[var(--warning)]"
                        }`}
                      >
                        {alert.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">{alert.action}</p>
                  </div>
                  <button
                    onClick={() => setOpenAlert(alert)}
                    className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--text-tertiary)] transition-colors duration-150 hover:bg-white/[0.05] hover:text-[var(--text-primary)]"
                  >
                    View
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </Reveal>

      <Reveal delay={160}>
        <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className={cardClass}>
            <h2 className="text-xl font-bold tracking-tight">Data Quality Events</h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
              Generated from {dashboardMeta.daysObserved} days of selected property telemetry.
            </p>

            <div className="mt-6 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={alertFrequency} layout="vertical" margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "var(--text-tertiary)", fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis dataKey="day" type="category" tick={{ fill: "var(--text-tertiary)", fontSize: 12 }} tickLine={false} axisLine={false} width={140} />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar dataKey="count" name="Days affected" fill="var(--accent)" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={700} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={cardClass}>
            <h2 className="text-xl font-bold tracking-tight">Severity Breakdown</h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
              What kind of alerts came up across the selected data window.
            </p>

            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<DarkTooltip />} />
                  <Pie
                    data={severityBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    isAnimationActive
                    animationDuration={700}
                  >
                    {severityBreakdown.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[var(--text-secondary)]">
              {severityBreakdown.map((entry) => (
                <span key={entry.name} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name} ({entry.value})
                </span>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal delay={240}>
        <section className={cardClass}>
          <div className="flex items-center gap-2">
            <History className="text-[var(--text-secondary)]" size={20} strokeWidth={1.75} />
            <h2 className="text-xl font-bold tracking-tight">Today's Activity Log</h2>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
            Chronological record of alerts, state changes, and system behavior today.
          </p>

          <div className="relative mt-6 space-y-4">
            <div className="absolute bottom-6 left-[72px] top-6 w-px bg-white/[0.08]" />

            {events.map((event, index) => {
              const Icon = event.icon;
              const style = severity[event.severity];

              return (
                <div
                  key={`${event.time}-${event.title}`}
                  className="relative grid grid-cols-[56px_32px_1fr] gap-4 opacity-0 animate-[reveal_600ms_ease-out_forwards]"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <p className="pt-2 text-xs font-semibold text-[var(--text-tertiary)]">
                    {event.time}
                  </p>

                  <div className={`z-10 flex h-8 w-8 items-center justify-center rounded-full ${style.bg}`}>
                    <Icon className={style.text} size={17} strokeWidth={1.75} />
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{event.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${style.bg} ${style.text}`}>
                        {event.chip}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                      {event.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </Reveal>

      {openAlert && <AlertDetailModal alert={openAlert} onClose={() => setOpenAlert(null)} />}
    </>
  );
}
