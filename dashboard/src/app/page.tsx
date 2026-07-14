import { getDailyVolumeTrend, getEngagedVsBypassedSummary } from "@/lib/queries";
import VolumeTrendChart from "@/components/VolumeTrendChart";
import Card from "@/components/Card";
import KpiCard from "@/components/KpiCard";
import { TrendingDown, FlaskConical, DollarSign } from "lucide-react";
export const dynamic = "force-dynamic";

export default async function Home() {
  const volumeTrend = await getDailyVolumeTrend();
  const comparison = await getEngagedVsBypassedSummary();

  return (
    <>
      <section className="grid grid-cols-3 gap-4 mb-8">
        <KpiCard
          label="Water Reduction (Engaged vs Bypassed)"
          value="~26%"
          detail="clean window, June 2026, p=0.0015"
          icon={TrendingDown}
          accent="green"
        />
        <KpiCard
          label="Statistical Significance"
          value="p = 0.0015"
          detail="Welch's t-test, Cohen's d = 2.65"
          icon={FlaskConical}
          accent="blue"
        />
        <KpiCard
          label="Leak Cost (observed window)"
          value="~$1,173 CAD"
          detail="lower bound, 15 pre-repair days"
          icon={DollarSign}
          accent="amber"
        />
      </section>

      <Card title="Daily Water Volume — Full Pilot">
        <VolumeTrendChart data={volumeTrend} />
      </Card>

      <Card title="Engaged vs. Bypassed by Era">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-neutral-800 text-left text-neutral-400">
              <th className="py-2 font-medium">Era</th>
              <th className="py-2 font-medium">State</th>
              <th className="py-2 font-medium">Days</th>
              <th className="py-2 font-medium">Avg Volume (L)</th>
            </tr>
          </thead>
          <tbody>
            {comparison.map((row, i) => (
              <tr key={i} className="border-b border-neutral-900">
                <td className="py-2">{row.era}</td>
                <td className="py-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      row.inferred_state === "Engaged"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {row.inferred_state}
                  </span>
                </td>
                <td className="py-2">{row.n_days}</td>
                <td className="py-2">{Number(row.avg_volume_l).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}