import { TrendingDown, TrendingUp } from "lucide-react";
import { useCountUp } from "../hooks/useCountUp";
import { severity } from "../theme";
import type { Severity } from "../types";
import type { DashboardData } from "../data/buildDashboardData";
import { LiveDot } from "./LiveDot";
import { LiveFlowLine } from "./LiveFlowLine";

type LiquidGaugeProps = {
  data: DashboardData;
};

export function LiquidGauge({ data }: LiquidGaugeProps) {
  const { dashboardMeta } = data;
  const { compareStats, todayDeviceState } = data.dashboard;
  // Bypassed isn't a fault, so it gets the attention color rather than critical.
  const deviceModeStyle: Severity = todayDeviceState === "Engaged" ? "success" : "warning";
  const health = useCountUp(dashboardMeta.stabilityIndex);

  return (
    <div>
      <div className="grid gap-5 sm:grid-cols-[148px_1fr] sm:items-center">
        <div className="relative mx-auto flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border border-white/[0.08] bg-[var(--bg-base)] shadow-inner">
          <div
            className="absolute bottom-0 w-full overflow-hidden bg-[linear-gradient(180deg,var(--accent),#075985)]"
            style={{ height: `${dashboardMeta.stabilityIndex}%` }}
          >
            <svg
              className="wave-back absolute -top-5 left-0 h-12 w-[200%]"
              viewBox="0 0 240 48"
              preserveAspectRatio="none"
            >
              <path
                d="M0 24 C30 4 60 44 90 24 S150 4 180 24 S230 44 240 24 V48 H0 Z"
                fill="rgba(255,255,255,0.34)"
              />
            </svg>
            <svg
              className="wave-front absolute -top-3 left-0 h-12 w-[200%]"
              viewBox="0 0 240 48"
              preserveAspectRatio="none"
            >
              <path
                d="M0 24 C30 42 60 6 90 24 S150 42 180 24 S230 6 240 24 V48 H0 Z"
                fill="rgba(255,255,255,0.52)"
              />
            </svg>
          </div>

          <div className="relative z-10 rounded-2xl bg-[rgba(11,18,32,0.62)] px-3 py-2.5 text-center backdrop-blur">
            <p className="text-3xl font-bold tracking-tight tabular-nums text-[var(--text-primary)]">
              {Math.round(health)}%
            </p>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
              Health
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
            Operator Status
          </p>
          <span
            className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${severity[deviceModeStyle].bg} ${severity[deviceModeStyle].text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${severity[deviceModeStyle].fill}`} />
            Device {todayDeviceState}
          </span>
          <div className="mt-3 inline-flex items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">
            <LiveDot />
            <span>Live-ready · CSV data through {dashboardMeta.latestReadingLabel}</span>
            <span className="h-4 w-px bg-white/[0.1]" />
            <LiveFlowLine />
          </div>
        </div>
      </div>

      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
        Current telemetry is generated from {dashboardMeta.readingCount.toLocaleString()} readings
        across {dashboardMeta.daysObserved} days of CSV history.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Flow", value: "Live", width: "86%", status: "success" as Severity },
          { label: "Pressure", value: "Review", width: "68%", status: "warning" as Severity },
          {
            label: "Telemetry",
            value: `${dashboardMeta.telemetryCompleteness}%`,
            width: `${dashboardMeta.telemetryCompleteness}%`,
            status: "info" as Severity,
          },
        ].map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium uppercase tracking-wide text-[var(--text-secondary)]">
                {item.label}
              </span>
              <span className={severity[item.status].text}>{item.value}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={`h-full rounded-full ${severity[item.status].fill} animate-[grow_900ms_ease-out_both]`}
                style={{ width: item.width }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="rounded-full bg-[color:var(--warning-soft)] px-3 py-1 text-xs font-semibold text-[var(--warning)]">
          Open items: {dashboardMeta.alertCount}
        </span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${severity[deviceModeStyle].bg} ${severity[deviceModeStyle].text}`}
        >
          Device {todayDeviceState.toLowerCase()}
        </span>
      </div>

      <div className="mt-6 border-t border-white/[0.06] pt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          Today vs 30-Day Average
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {compareStats.map((stat) => {
            const TrendIcon = stat.trend === "up" ? TrendingUp : TrendingDown;

            return (
              <div key={stat.label} className="rounded-xl bg-white/[0.03] p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
                  {stat.label}
                </p>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-lg font-bold tracking-tight tabular-nums text-[var(--text-primary)]">
                    {stat.today}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-[var(--accent)]">
                    <TrendIcon size={13} strokeWidth={2} />
                    {stat.change}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                  30-day avg: {stat.avg}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
