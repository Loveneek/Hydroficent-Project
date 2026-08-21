import { useState } from "react";
import { Droplet } from "lucide-react";
import { navItems } from "./data/nav";
import { useDashboardData } from "./hooks/useDashboardData";
import { AlertsPage } from "./pages/AlertsPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ReportsPage } from "./pages/ReportsPage";
import type { Page } from "./types";

function App() {
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const { data, error } = useDashboardData();

  return (
    <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <style>
        {`
          :root {
            --bg-base: #0B1220;
            --bg-surface: #121B2E;
            --bg-surface-hover: #182238;
            --text-primary: #F1F5F9;
            --text-secondary: #94A3B8;
            --text-tertiary: #64748B;
            --accent: #0EA5E9;
            --success: #38BDF8;
            --warning: #FBBF24;
            --critical: #F87171;
            --info: #818CF8;
            --success-soft: rgba(56, 189, 248, 0.12);
            --warning-soft: rgba(251, 191, 36, 0.12);
            --critical-soft: rgba(248, 113, 113, 0.12);
            --info-soft: rgba(129, 140, 248, 0.12);
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }

          @keyframes reveal {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes grow {
            from { transform: scaleX(0); transform-origin: left; }
            to { transform: scaleX(1); transform-origin: left; }
          }

          @keyframes wave-move {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }

          @keyframes hero-glow {
            0%, 100% { transform: translate3d(-6%, -4%, 0); opacity: 0.24; }
            50% { transform: translate3d(6%, 4%, 0); opacity: 0.42; }
          }

          @keyframes draw-line {
            from { stroke-dashoffset: 120; }
            to { stroke-dashoffset: 0; }
          }

          .wave-back { animation: wave-move 6s linear infinite; opacity: 0.5; }
          .wave-front { animation: wave-move 4s linear infinite reverse; opacity: 0.85; }

          @keyframes flow-line-scroll {
            from { transform: translateX(0); }
            to { transform: translateX(-64px); }
          }

          .flow-line { animation: flow-line-scroll 2.2s linear infinite; }
        `}
      </style>

      <div className="flex min-h-screen">
        <aside className="flex w-20 shrink-0 flex-col border-r border-white/[0.06] bg-[var(--bg-surface)] p-3 md:w-64 md:p-5">
          <div className="mb-8 flex items-center justify-center gap-3 md:justify-start">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--bg-base)]">
              <Droplet size={23} strokeWidth={1.75} />
            </div>
            <div className="hidden md:block">
              <p className="text-base font-semibold">Hydroficient</p>
              <p className="text-xs text-[var(--text-secondary)]">
                Operator Console
              </p>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.page === activePage;

              return (
                <button
                  key={item.label}
                  onClick={() => item.page && setActivePage(item.page)}
                  className={`flex w-full items-center justify-center gap-3 rounded-xl border px-3 py-3 text-sm font-semibold transition-all duration-200 md:justify-start ${
                    isActive
                      ? "border-[var(--accent)] bg-[color:rgba(14,165,233,0.12)] text-[var(--accent)]"
                      : "border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <Icon size={19} strokeWidth={1.75} />
                  <span className="hidden md:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 md:block">
            <p className="text-sm font-semibold">One-location design</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
              {data
                ? `${data.dashboardMeta.daysObserved} days of ${data.dashboardMeta.propertyName} data today.`
                : "Loading selected property data."}
              {" "}Designed so live telemetry can be connected later.
            </p>
          </div>
        </aside>

        <section className="min-w-0 flex-1 px-6 py-6 md:px-10">
          <div className="mx-auto max-w-[1600px] space-y-6">
            {error ? (
              <section className="rounded-2xl border border-white/[0.06] bg-[var(--bg-surface)] p-6 shadow-lg shadow-black/20">
                <p className="text-sm font-semibold text-[var(--warning)]">Data connection needed</p>
                <h1 className="mt-4 text-3xl font-bold tracking-tight">Unable to load dashboard data</h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
                  {error} Add the Supabase frontend variables for this property and reload the dashboard.
                </p>
              </section>
            ) : !data ? (
              <section className="rounded-2xl border border-white/[0.06] bg-[var(--bg-surface)] p-6 shadow-lg shadow-black/20">
                <p className="text-sm font-semibold text-[var(--accent)]">Hydroficient</p>
                <h1 className="mt-4 text-3xl font-bold tracking-tight">Loading operator dashboard</h1>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Connecting to the selected property dataset.
                </p>
              </section>
            ) : activePage === "analytics" ? (
              <AnalyticsPage data={data} />
            ) : activePage === "alerts" ? (
              <AlertsPage data={data} />
            ) : activePage === "reports" ? (
              <ReportsPage data={data} />
            ) : (
              <DashboardPage data={data} />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
