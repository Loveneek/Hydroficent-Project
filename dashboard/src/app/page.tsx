import { getDailyVolumeTrend, getDataQualitySummary, getEngagedVsBypassedSummary } from "@/lib/queries";
import VolumeTrendChart from "@/components/VolumeTrendChart";

export default async function Home() {
  const volumeTrend = await getDailyVolumeTrend();
  const comparison = await getEngagedVsBypassedSummary();
  const dataQuality = await getDataQualitySummary();

  return (
    <main className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Hydroficient Pilot Dashboard</h1>

      <section className="grid grid-cols-3 gap-4 mb-10">
        <div className="border rounded-lg p-4">
          <div className="text-sm text-gray-500">Water Reduction (Engaged vs Bypassed)</div>
          <div className="text-2xl font-bold">~26%</div>
          <div className="text-xs text-gray-500">clean window, June 2026, p=0.0015</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-gray-500">Statistical Significance</div>
          <div className="text-2xl font-bold">p = 0.0015</div>
          <div className="text-xs text-gray-500">Welch&apos;s t-test, Cohen&apos;s d = 2.65</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-gray-500">Leak Cost (observed window)</div>
          <div className="text-2xl font-bold">~$1,173 CAD</div>
          <div className="text-xs text-gray-500">lower bound, 15 pre-repair days</div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-2">Daily Water Volume — Full Pilot</h2>
        <VolumeTrendChart data={volumeTrend} />
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-2">Engaged vs. Bypassed by Era</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Era</th>
              <th className="py-2">State</th>
              <th className="py-2">Days</th>
              <th className="py-2">Avg Volume (L)</th>
            </tr>
          </thead>
          <tbody>
            {comparison.map((row, i) => (
              <tr key={i} className="border-b">
                <td className="py-2">{row.era}</td>
                <td className="py-2">{row.inferred_state}</td>
                <td className="py-2">{row.n_days}</td>
                <td className="py-2">{Number(row.avg_volume_l).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-2">Data Quality Audit</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Issue Type</th>
              <th className="py-2">Days Affected</th>
              <th className="py-2">Seconds Affected</th>
            </tr>
          </thead>
          <tbody>
            {dataQuality.map((row, i) => (
              <tr key={i} className="border-b">
                <td className="py-2">{row.issue_type}</td>
                <td className="py-2">{row.n_days}</td>
                <td className="py-2">{row.total_seconds}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}