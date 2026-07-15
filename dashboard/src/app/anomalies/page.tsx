import { getGateActivityTrend, getDataCompleteness } from "@/lib/queries";
import GateActivityChart from "@/components/GateActivityChart";
import DataCompletenessChart from "@/components/DataCompletenessChart";
import Card from "@/components/Card";
export const dynamic = "force-dynamic";

export default async function AnomaliesPage() {
  const gateActivity = await getGateActivityTrend();
  const completeness = await getDataCompleteness();

  return (
    <>
      <Card
        title="Gate Activity vs. Pressure Differential (Engaged days)"
        description="Gate activity (red) roughly triples from May to June while pressure differential (blue) stays flat or improves slightly — a possible mechanical wear signal."
        findingHref="/findings#s7"
      >
        <GateActivityChart data={gateActivity} />
      </Card>

      <Card
        title="Data Completeness by Day"
        description="Orange bars are incomplete days. The late-May cluster reflects intermittent connectivity, not a sensor problem."
        findingHref="/findings#s8"
      >
        <DataCompletenessChart data={completeness} />
      </Card>
    </>
  );
}