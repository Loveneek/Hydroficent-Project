import { getWeeklyStateTrend, getClassifierDistribution, getHourlyPattern } from "@/lib/queries";
import WeeklyStateTrendChart from "@/components/WeeklyStateTrendChart";
import ClassifierDistributionChart from "@/components/ClassifierDistributionChart";
import HourlyPatternChart from "@/components/HourlyPatternChart";
import Card from "@/components/Card";
export const dynamic = "force-dynamic";

export default async function TrendsPage() {
  const weeklyTrend = await getWeeklyStateTrend();
  const classifierDist = await getClassifierDistribution();
  const hourlyPattern = await getHourlyPattern();

  return (
    <>
      <Card
        title="Weekly Trend by State (Weekday-only)"
        description="Both states decline together through the leak-decay period, then stabilize from late May onward — confirms the effect isn't just a state-mix artifact."
        findingHref="/findings#s5"
      >
        <WeeklyStateTrendChart data={weeklyTrend} />
      </Card>

      <Card
        title="Engaged/Bypassed Classifier Validation"
        description="Each bar is one day, sorted by gate activity (std_ga). A clean gap between the low (Bypassed, red) and high (Engaged, green) clusters confirms the classifier threshold is well-placed, not arbitrary."
        findingHref="/findings#s1"
      >
        <ClassifierDistributionChart data={classifierDist} />
      </Card>

      <Card
        title="Water Use by Hour of Day"
        description="Average water use for each hour, split by device state — shows when usage peaks during the day and whether the device's effect is consistent across the whole day or concentrated at certain hours."
        findingHref="/findings#s10"
      >
        <HourlyPatternChart data={hourlyPattern} />
      </Card>
    </>
  );
}