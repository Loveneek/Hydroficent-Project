import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertDetailModal } from "../components/AlertDetailModal";
import { CountUp } from "../components/CountUp";
import { DarkTooltip } from "../components/DarkTooltip";
import { LiquidGauge } from "../components/LiquidGauge";
import { Reveal } from "../components/Reveal";
import { cardClass, severity } from "../theme";
import type { AlertRecord } from "../types";
import type { DashboardData } from "../data/buildDashboardData";

type DashboardPageProps = {
  data: DashboardData;
};

export function DashboardPage({ data }: DashboardPageProps) {
  const [openAlert, setOpenAlert] = useState<AlertRecord | null>(null);
  const { dashboardMeta } = data;
  const {
    activeAlerts,
  } = data.alerts;
  const {
    deviceModeHistory,
    deviceModeSummary,
    events,
    hourlyUsage,
    kpis,
    pressureTrendLabel,
    trendData,
  } = data.dashboard;
  const pressureTrendData = trendData.filter(
    (point) =>
      Number.isFinite(point.pressureUp) &&
      Number.isFinite(point.pressureDown) &&
      point.pressureUp > 0 &&
      point.pressureDown > 0,
  );
  const pressureValues = pressureTrendData.flatMap((point) => [point.pressureUp, point.pressureDown]);
  const pressureMin = Math.min(...pressureValues);
  const pressureMax = Math.max(...pressureValues);
  const pressurePadding = Math.max(4, Math.round((pressureMax - pressureMin) * 0.2));
  const pressureDomain: [number, number] = pressureValues.length
    ? [Math.max(0, Math.floor(pressureMin - pressurePadding)), Math.ceil(pressureMax + pressurePadding)]
    : [0, 100];
  const stableBandStart = Math.max(pressureDomain[0], 45);
  const stableBandEnd = Math.min(pressureDomain[1], 80);

  return (
    <>
      <Reveal>
        <section className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[var(--bg-surface)] p-6 shadow-lg shadow-black/20">
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(14,165,233,0.24),transparent_34%)]"
            style={{ animation: "hero-glow 20s ease-in-out infinite" }}
          />
          <div className="relative grid gap-10 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-[var(--accent)]">
                Home / Operator Dashboard
              </p>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-[var(--text-primary)] md:text-5xl">
                Good Morning, Operator
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                {dashboardMeta.propertyName} · Latest reading: {dashboardMeta.latestReadingLabel}
              </p>

              <div className="mt-8 grid grid-cols-2 gap-3">
                {kpis.map((kpi) => {
                  const Icon = kpi.icon;
                  const style = severity[kpi.severity];

                  return (
                    <div
                      key={kpi.label}
                      className="rounded-xl bg-white/[0.03] p-4 transition-colors duration-200 hover:bg-white/[0.06]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
                          {kpi.label}
                        </p>
                        <div className="text-[var(--text-secondary)]">
                          <Icon size={16} strokeWidth={1.75} />
                        </div>
                      </div>

                      <div className="mt-2 flex items-baseline gap-1.5">
                        <p className="text-2xl font-bold tracking-tight tabular-nums text-[var(--text-primary)]">
                          <CountUp target={kpi.value} display={kpi.display} decimals={kpi.decimals} />
                        </p>
                        {kpi.unit && (
                          <span className="text-xs font-semibold text-[var(--text-secondary)]">
                            {kpi.unit}
                          </span>
                        )}
                      </div>

                      {kpi.hint && (
                        <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                          {kpi.hint}
                        </p>
                      )}

                      <svg
                        viewBox="0 0 88 36"
                        className={`mt-2 h-6 w-full ${style.text}`}
                        fill="none"
                      >
                        <path
                          d={kpi.sparkline}
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray="120"
                          style={{ animation: "draw-line 600ms ease-out both" }}
                        />
                        <circle r="3.2" fill="currentColor">
                          <animateMotion
                            dur="2.6s"
                            begin="0.6s"
                            repeatCount="indefinite"
                            path={kpi.sparkline}
                          />
                        </circle>
                        <circle r="6" fill="currentColor" opacity="0.35">
                          <animateMotion
                            dur="2.6s"
                            begin="0.6s"
                            repeatCount="indefinite"
                            path={kpi.sparkline}
                          />
                          <animate
                            attributeName="r"
                            values="3;7;3"
                            dur="1.3s"
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="opacity"
                            values="0.45;0;0.45"
                            dur="1.3s"
                            repeatCount="indefinite"
                          />
                        </circle>
                      </svg>
                    </div>
                  );
                })}
              </div>
            </div>

            <LiquidGauge data={data} />
          </div>
        </section>
      </Reveal>

      <Reveal delay={80}>
        <section className="grid gap-5">
          <div className={cardClass}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Alert Queue</h2>
                <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                  Active items that need operator review.
                </p>
              </div>
              <span className="rounded-full bg-[color:var(--warning-soft)] px-3 py-1 text-xs font-semibold text-[var(--warning)]">
                {activeAlerts.length} open
              </span>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {activeAlerts.map((alert) => {
                const style = severity[alert.severity];

                return (
                  <button
                    key={alert.id}
                    onClick={() => setOpenAlert(alert)}
                    className="group grid grid-cols-[1fr_auto] items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-left transition-colors duration-150 hover:bg-[var(--bg-surface-hover)]"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${style.fill} opacity-50`} />
                          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${style.fill}`} />
                        </span>
                        <p className="font-semibold">{alert.title}</p>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${style.bg} ${style.text}`}>
                          {alert.time}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        {alert.action}
                      </p>
                    </div>
                    <span className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--text-tertiary)] transition-colors duration-150 group-hover:bg-white/[0.05] group-hover:text-[var(--text-primary)]">
                      View
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal delay={160}>
        <section className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
          <div className={cardClass}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  Water Use by Hour of Day
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                  Average hourly volume across {dashboardMeta.daysObserved} days. Amber bars are
                  outside normal business hours and worth a look.
                </p>
              </div>
              <span className="rounded-full bg-[color:var(--success-soft)] px-3 py-1 text-xs font-semibold text-[var(--success)]">
                gal
              </span>
            </div>

            <div className="mt-6 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyUsage} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="hour"
                    tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    interval={2}
                  />
                  <YAxis tick={{ fill: "var(--text-tertiary)", fontSize: 12 }} tickLine={false} axisLine={false} width={34} />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar
                    dataKey="value"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive
                    animationDuration={700}
                    animationEasing="ease-out"
                  >
                    {hourlyUsage.map((entry) => (
                      <Cell
                        key={entry.hour}
                        fill={entry.offHours ? "var(--warning)" : "var(--success)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
                Normal hours
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--warning)]" />
                Outside business hours — worth checking
              </span>
            </div>
          </div>

          <div className={cardClass}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  Upstream vs Downstream Pressure
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Inlet vs outlet pressure by hour, last available pressure day: {pressureTrendLabel}.
                </p>
              </div>
              <span className="rounded-full bg-[color:var(--success-soft)] px-3 py-1 text-xs font-semibold text-[var(--success)]">
                psi
              </span>
            </div>

            <div className="mt-6 h-72">
              {pressureTrendData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={pressureTrendData} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pressureUpFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--success)" stopOpacity={0.32} />
                        <stop offset="95%" stopColor="var(--success)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    {stableBandEnd > stableBandStart && (
                      <ReferenceArea y1={stableBandStart} y2={stableBandEnd} fill="var(--success)" fillOpacity={0.06} />
                    )}
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="time" tick={{ fill: "var(--text-tertiary)", fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis
                      domain={pressureDomain}
                      tick={{ fill: "var(--text-tertiary)", fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={34}
                    />
                    <Tooltip content={<DarkTooltip />} />
                    <Area
                      isAnimationActive
                      animationDuration={900}
                      animationEasing="ease-out"
                      type="monotone"
                      dataKey="pressureUp"
                      name="Upstream"
                      stroke="var(--success)"
                      strokeWidth={3}
                      fill="url(#pressureUpFill)"
                      dot={false}
                    />
                    <Area
                      isAnimationActive
                      animationDuration={900}
                      animationEasing="ease-out"
                      type="monotone"
                      dataKey="pressureDown"
                      name="Downstream"
                      stroke="var(--info)"
                      strokeWidth={2.5}
                      fill="none"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] text-center">
                  <p className="max-w-sm text-sm leading-relaxed text-[var(--text-secondary)]">
                    Pressure readings are not available for the latest complete day.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
                Upstream
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--info)]" />
                Downstream
              </span>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal delay={240}>
        <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className={cardClass}>
            <h2 className="text-xl font-bold tracking-tight">
              Device Mode — Last 14 Days
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Device state is classified once per day from gate activity, not intraday.
            </p>

            <div className="mt-6">
              <div className="flex h-14 gap-1 overflow-hidden rounded-xl">
                {deviceModeHistory.map((day, index) => (
                  <div
                    key={day.date}
                    title={`${day.date}: Device ${day.state}`}
                    className={`h-full flex-1 rounded-md ${
                      day.state === "Engaged" ? severity.success.fill : "bg-white/[0.12]"
                    } animate-[grow_700ms_ease-out_both]`}
                    style={{ animationDelay: `${index * 40}ms` }}
                  />
                ))}
              </div>

              <div className="mt-3 flex justify-between text-xs text-[var(--text-tertiary)]">
                <span>{deviceModeSummary.startLabel}</span>
                <span>{deviceModeSummary.midLabel}</span>
                <span>{deviceModeSummary.endLabel}</span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
                  Device Engaged
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-white/[0.3]" />
                  Device Bypassed
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-[color:var(--success-soft)] p-4">
                <p className="text-xs font-semibold text-[var(--success)]">Device Engaged</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {deviceModeSummary.engagedDays} of {deviceModeSummary.totalDays} days
                </p>
              </div>
              <div className="rounded-xl bg-white/[0.04] p-4">
                <p className="text-xs font-semibold text-[var(--text-secondary)]">Device Bypassed</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {deviceModeSummary.bypassedDays} of {deviceModeSummary.totalDays} days
                </p>
              </div>
              <div className="rounded-xl bg-[color:var(--info-soft)] p-4">
                <p className="text-xs font-semibold text-[var(--info)]">Availability</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {deviceModeSummary.availabilityPct}%
                </p>
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <h2 className="text-xl font-bold tracking-tight">Event Timeline</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Operator-readable explanation of alerts, state changes, and system behavior.
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
          </div>
        </section>
      </Reveal>

      {openAlert && <AlertDetailModal alert={openAlert} onClose={() => setOpenAlert(null)} />}
    </>
  );
}
