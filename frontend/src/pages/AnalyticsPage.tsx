import { ShieldCheck, Wrench } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DarkTooltip } from "../components/DarkTooltip";
import { Reveal } from "../components/Reveal";
import { cardClass, severity } from "../theme";
import type { DashboardData } from "../data/buildDashboardData";

type AnalyticsPageProps = {
  data: DashboardData;
};

export function AnalyticsPage({ data }: AnalyticsPageProps) {
  const {
    analyticsKpis,
    analyticsMeta,
    completeness,
    maintenanceSignal,
    periodComparison,
    pressureResult,
    weeklyVolumeTrend,
  } = data.analytics;

  return (
    <>
      <Reveal>
        <section className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[var(--bg-surface)] p-6 shadow-lg shadow-black/20">
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(14,165,233,0.24),transparent_34%)]"
            style={{ animation: "hero-glow 20s ease-in-out infinite" }}
          />
          <div className="relative">
            <p className="text-sm font-semibold text-[var(--accent)]">Home / Analytics</p>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-[var(--text-primary)] md:text-5xl">
              Savings &amp; Performance
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
              {analyticsMeta.reviewLabel}
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              {analyticsKpis.map((kpi) => {
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
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                Weekly Water Volume — Engaged vs Bypassed
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                {analyticsMeta.weeklyChartDescription}
              </p>
            </div>
            <span className="rounded-full bg-[color:var(--success-soft)] px-3 py-1 text-xs font-semibold text-[var(--success)]">
              gal/day
            </span>
          </div>

          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyVolumeTrend} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: "var(--text-tertiary)", fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fill: "var(--text-tertiary)", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                />
                <Tooltip content={<DarkTooltip />} />
                <Line
                  type="monotone"
                  dataKey="bypassed"
                  name="Device Bypassed"
                  stroke="var(--text-tertiary)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  isAnimationActive
                  animationDuration={900}
                />
                <Line
                  type="monotone"
                  dataKey="engaged"
                  name="Device Engaged"
                  stroke="var(--success)"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  isAnimationActive
                  animationDuration={900}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
              Device Engaged
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--text-tertiary)]" />
              Device Bypassed
            </span>
          </div>
        </section>
      </Reveal>

      <Reveal delay={160}>
        <section className="grid gap-5 xl:grid-cols-[0.55fr_0.45fr]">
          <div className={cardClass}>
            <h2 className="text-xl font-bold tracking-tight">First Half vs Second Half</h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
              {analyticsMeta.periodComparisonDescription}
            </p>

            <div className="mt-6 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={periodComparison} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="period" tick={{ fill: "var(--text-tertiary)", fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fill: "var(--text-tertiary)", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                    tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                  />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar dataKey="Device Bypassed" fill="var(--text-tertiary)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={700} />
                  <Bar dataKey="Device Engaged" fill="var(--success)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={700} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--text-tertiary)]" />
                Device Bypassed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
                Device Engaged
              </span>
            </div>
          </div>

          <div className={cardClass}>
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-[var(--success)]" size={20} strokeWidth={1.75} />
              <h2 className="text-xl font-bold tracking-tight">How Confident Are We?</h2>
            </div>
            <p className="mt-4 text-5xl font-bold tracking-tight text-[var(--success)]">
              {analyticsMeta.confidenceHeadline}
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {analyticsMeta.confidenceCaption}
            </p>

            <div className="mt-5 space-y-3 text-sm text-[var(--text-secondary)]">
              <div className="flex items-center justify-between rounded-xl bg-white/[0.03] p-3">
                <span>Device Engaged</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {analyticsMeta.engagedDaily}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/[0.03] p-3">
                <span>Device Bypassed</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {analyticsMeta.bypassedDaily}
                </span>
              </div>
            </div>

            <p className="mt-5 text-xs leading-relaxed text-[var(--text-tertiary)]">
              {analyticsMeta.confidenceNote}
            </p>
          </div>
        </section>
      </Reveal>

      <Reveal delay={240}>
        <section className={cardClass}>
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[color:var(--warning-soft)] p-2">
              <Wrench className="text-[var(--warning)]" size={20} strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {maintenanceSignal.title}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                {maintenanceSignal.description}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-white/[0.03] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                Gate Activity — {maintenanceSignal.firstLabel}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{maintenanceSignal.firstValue}</p>
            </div>
            <div className={`rounded-xl p-4 ${severity[maintenanceSignal.severity].bg}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide ${severity[maintenanceSignal.severity].text}`}>
                Gate Activity — {maintenanceSignal.latestLabel}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{maintenanceSignal.change}</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                Pressure Result
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{pressureResult}</p>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal delay={320}>
        <section className={cardClass}>
          <h2 className="text-xl font-bold tracking-tight">Telemetry Reliability</h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
            {analyticsMeta.reliabilityDescription} Days below 50% are excluded from mode comparisons.
          </p>

          <div className="mt-6 flex flex-wrap gap-1">
            {completeness.map((value, index) => {
              let color = "var(--success)";
              if (value === 0) color = "var(--critical)";
              else if (value < 50) color = "var(--warning)";

              return (
                <div
                  key={index}
                  className="h-6 w-3 rounded-sm"
                  style={{
                    backgroundColor: color,
                    opacity: value === 0 ? 1 : Math.max(value / 100, 0.25),
                  }}
                  title={`Day ${index + 1}: ${value}% complete`}
                />
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
              Full data
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--warning)]" />
              Partial
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--critical)]" />
              Missing
            </span>
          </div>
        </section>
      </Reveal>
    </>
  );
}
