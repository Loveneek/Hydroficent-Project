import { getSundayLeakComparison, getDataQualitySummary } from "@/lib/queries";
import LeakComparisonChart from "@/components/LeakComparisonChart";
import Card from "@/components/Card";

export default async function LeakQualityPage() {
  const leakComparison = await getSundayLeakComparison();
  const dataQuality = await getDataQualitySummary();

  return (
    <>
      <Card
        title="Leak Cost: Sunday Volume, Pre vs. Post Repair"
        description="Sundays are closed, so this is almost entirely leak volume, not business use."
      >
        <LeakComparisonChart data={leakComparison} />
      </Card>

      <Card title="Data Quality Audit">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-neutral-800 text-left text-neutral-400">
              <th className="py-2 font-medium">Issue Type</th>
              <th className="py-2 font-medium">Days Affected</th>
              <th className="py-2 font-medium">Seconds Affected</th>
            </tr>
          </thead>
          <tbody>
            {dataQuality.map((row, i) => (
              <tr key={i} className="border-b border-neutral-900">
                <td className="py-2">{row.issue_type}</td>
                <td className="py-2">{row.n_days}</td>
                <td className="py-2">{row.total_seconds}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}