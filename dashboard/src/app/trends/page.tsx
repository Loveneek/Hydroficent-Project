import { getWeeklyStateTrend, getClassifierDistribution } from "@/lib/queries";
import WeeklyStateTrendChart from "@/components/WeeklyStateTrendChart";
import ClassifierDistributionChart from "@/components/ClassifierDistributionChart";
import Card from "@/components/Card";
export const dynamic = "force-dynamic";

export default async function TrendsPage() {
  const weeklyTrend = await getWeeklyStateTrend();
  const classifierDist = await getClassifierDistribution();

  return (
    <>
      <Card
        title="Weekly Trend by State (Weekday-only)"
        description="Both states decline together through the leak-decay period, then stabilize from late May onward — confirms the effect isn't just a state-mix artifact."
      >
        <WeeklyStateTrendChart data={weeklyTrend} />
      </Card>

      <Card
        title="Engaged/Bypassed Classifier Validation"
        description="Each bar is one day, sorted by gate activity (std_ga). A clean gap between the low (Bypassed, red) and high (Engaged, green) clusters confirms the classifier threshold is well-placed, not arbitrary."
      >
        <ClassifierDistributionChart data={classifierDist} />
      </Card>
    </>
  );
}