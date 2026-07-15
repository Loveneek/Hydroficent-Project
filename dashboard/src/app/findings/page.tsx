import Card from "@/components/Card";

const SECTIONS = [
  { id: "s1", label: "1. Engaged/Bypassed Classifier Validation" },
  { id: "s2", label: "2. Making sure the comparison was fair" },
  { id: "s3", label: "3. Data Quality Audit" },
  { id: "s4", label: "4. Catching and fixing a bug that would have wrecked one day's numbers" },
  { id: "s5", label: "5. Weekly Trend by State (Weekday-only)" },
  { id: "s6", label: "6. Leak Cost: Sunday Volume, Pre vs. Post Repair" },
  { id: "s7", label: "7. Gate Activity vs. Pressure Differential (Engaged days)" },
  { id: "s8", label: "8. Data Completeness by Day" },
  { id: "s9", label: "9. Engaged vs. Bypassed by Era" },
  { id: "s10", label: "10. Water Use by Hour of Day" },
];

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-neutral-300 leading-relaxed mb-4">{children}</p>;
}

function StatTable({ rows }: { rows: [string, string][] }) {
  return (
    <div className="border border-neutral-800 rounded-lg overflow-hidden my-4">
      {rows.map(([label, value], i) => (
        <div
          key={label}
          className={`flex justify-between px-4 py-2 text-sm ${
            i % 2 === 0 ? "bg-neutral-900/60" : "bg-neutral-900/30"
          }`}
        >
          <span className="text-neutral-400">{label}</span>
          <span className="text-neutral-100 font-medium">{value}</span>
        </div>
      ))}
    </div>
  );
}

export default function FindingsPage() {
  return (
    <>
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 mb-8">
        <p className="text-sm font-semibold text-neutral-200 mb-3">Jump to a finding:</p>
        <div className="flex flex-col gap-2">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="text-sm text-blue-400 hover:text-blue-300">
              {s.label}
            </a>
          ))}
        </div>
      </div>

   <section id="s1" className="scroll-mt-24 mb-8">
        <Card title="1. Engaged/Bypassed Classifier Validation" description="How the Engaged/Bypassed label was derived from raw sensor data.">
          <P>{`The raw data doesn't include a label marking which days the device was actively working versus switched off — that had to be worked out from the sensor readings themselves. The approach: measure how much the device's internal gate physically moved each day. A gate that barely moves at all is a strong sign the device was switched off (Bypassed); a gate that moves around a lot is a sign it was actively working (Engaged). Measuring this movement across all 63 days and sorting them from least to most active reveals a very clean split: a cluster of days where the gate essentially never moved, then a noticeable jump, then the remaining days where it moved substantially. That gap in the middle is what makes the Engaged/Bypassed line credible — it isn't an arbitrary guess, the data itself shows a clear break.`}</P>
        </Card>
      </section>

      <section id="s2" className="scroll-mt-24 mb-8">
        <Card title="2. Making sure the comparison was fair" description="Checking the Engaged/Bypassed groups had a similar weekday/weekend mix.">
          <P>{`Before comparing water use on "Device On" days versus "Device Off" days, it's worth ruling out a trap: what if one group simply included more weekends, when the dealership naturally uses less water regardless of the device? That would make one group look better or worse for a reason that has nothing to do with the device itself. Checking the weekday/weekend mix in each group shows that, after the leak was fixed, the mix is close to even in both groups — so that comparison holds up. Before the leak was fixed, the mix was lopsided and only 16 days of data existed — too small and unbalanced to draw reliable conclusions from, so that early period is excluded from the main comparison.`}</P>
        </Card>
      </section>

      <section id="s3" className="scroll-mt-24 mb-8">
        <Card title="3. Data Quality Audit" description="A logged, auditable record of every irregular reading instead of silent deletion.">
          <P>{`Rather than silently discarding any reading that looked unusual, every irregular reading is logged with a clear reason so nothing is hidden. Five categories of problems are checked for: duplicate timestamps, unexpected meter resets, impossible jumps in water volume, out-of-range pressure or temperature readings, and backwards flow. Out of roughly 5 million individual readings, here is everything that was flagged: harmless duplicate readings across 44 days (the device resending the same moment twice), one meter reset, and one real sensor glitch (covered in detail next). Pressure, temperature, and flow readings were completely normal every single time across the entire pilot.`}</P>
        </Card>
      </section>

      <section id="s4" className="scroll-mt-24 mb-8">
        <Card title="4. Catching and fixing a bug that would have wrecked one day's numbers" description="A single sensor glitch that inflated one day's total by ~46x.">
          <P>{`While reviewing the results day by day, one single day showed water usage roughly 50 times higher than every other day — far too suspicious to be real. Tracing it down pinpointed one exact second: the water meter's running total dropped to zero and then jumped straight back to its prior value, all within one second, while the flow sensor read zero the entire time. That points to a sensor glitch, not real water use. The first attempted fix — a flat volume cutoff — was too heavy-handed and wrongly flagged 198 completely normal moments as errors, simply because the device happened to send its data a little late that second. The fix was refined to judge readings by rate of flow instead — volume divided by elapsed time — and only flag something as an error if that rate was physically impossible for this device. That resolved both problems at once.`}</P>
          <StatTable rows={[
            ["Day total before fix", "1,116,538 L"],
            ["Day total after fix", "24,132 L"],
            ["False positives avoided", "198 readings"],
          ]} />
        </Card>
      </section>

      <section id="s5" className="scroll-mt-24 mb-8">
        <Card title="5. Weekly Trend by State (Weekday-only)" description="Weekly trend, split by state, weekdays only.">
          <P>{`Aggregating water use by week, split by device state and restricted to weekdays only, shows the broader trend across the two-month pilot. Both states decline together through April and May — consistent with the leak slowly worsening and then finally getting repaired — and both level off by late May. The fact that both groups decline at the same time is an important check: it confirms the early decline was caused by the leak, not by which mode the device happened to be running in that week. From June onward, once things settle down, a consistent gap appears every week — "Device Off" days consistently use more water than "Device On" days.`}</P>
        </Card>
      </section>

      <section id="s6" className="scroll-mt-24 mb-8">
        <Card title="6. Leak Cost: Sunday Volume, Pre vs. Post Repair" description="Isolated using Sunday-only volume, when the dealership is closed.">
          <P>{`To put a number on the leak's cost, it needed to be isolated from normal water use. Sunday volume works well for this, since the dealership is closed and almost nothing should be using water except the leak itself. Comparing average Sunday water use before the leak was fixed against after gives the leak's daily rate. Multiplying that by the number of pre-repair days captured in the dataset, then converting to dollars using the water rate, produces the estimate below.`}</P>
          <StatTable rows={[
            ["Estimated leak cost", "≈ $1,173 CAD"],
            ["Sundays used (before / after)", "3 / 5"],
          ]} />
          <P>{`This is likely an undercount, since the leak may have started before the dataset begins, and the small Sunday sample means the real number could reasonably be somewhat higher or lower.`}</P>
        </Card>
      </section>

      <section id="s7" className="scroll-mt-24 mb-8">
        <Card title="7. Gate Activity vs. Pressure Differential (Engaged days)" description="Possible mechanical wear signal — worth a physical inspection.">
          <P>{`This pattern wasn't something specifically searched for — it surfaced while double-checking the data. Comparing two similar, stable stretches of time (one in May, one in June, both well after the leak had settled) on gate activity versus pressure differential achieved reveals something notable: in June, the gate moved almost three times as much as in May, but achieved about the same pressure result, if not slightly better. In plain terms, the device appears to be working harder over time to reach the same outcome — a pattern consistent with mechanical wear, though confirming the actual cause would require a physical inspection of the unit.`}</P>
        </Card>
      </section>

      <section id="s8" className="scroll-mt-24 mb-8">
        <Card title="8. Data Completeness by Day" description="Intermittent connectivity, not a device failure — excluded from all comparisons.">
          <P>{`Checking how much data actually arrived for each day matters, because a gap in the data can quietly distort a calculation without it being obvious. One day is missing entirely from the dataset, and about a week in late May shows patchy data — some days only 15-30% complete. Notably, right in the middle of that rough stretch sits one fully healthy day. That pattern — a good day sandwiched between bad ones — points to an intermittent connectivity issue on the device's end rather than the device itself failing. Around 13% of the pilot window is affected, and none of these incomplete days are included in any of the comparisons in this review.`}</P>
        </Card>
      </section>

      <section id="s9" className="scroll-mt-24 mb-8">
        <Card title="9. Engaged vs. Bypassed by Era" description="Welch's t-test + Mann-Whitney U on the clean, leak-settled window.">
          <P>{`Restricting to a clean, fair window — weekdays only, after the leak had fully settled, starting June 1st — produces the real comparison. Two different statistical tests, each approaching the question from a different angle, were run to confirm this wasn't just random chance, and both agree the difference is real.`}</P>
          <StatTable rows={[
            ["n", "8 Bypassed, 7 Engaged"],
            ["Avg — Bypassed", "≈ 23,247 L/day"],
            ["Avg — Engaged", "≈ 17,081 L/day"],
            ["Difference", "≈ 6,166 L/day (26.5% less)"],
            ["Welch's t-test", "t=4.845, p=0.0015"],
            ["Mann-Whitney U", "U=56, p=0.0003"],
            ["Cohen's d (effect size)", "2.65 (very large)"],
          ]} />
          <P>{`Even more convincing, every single "Device Off" day in this window used more water than every single "Device On" day — no overlap between the two groups at all. One honest caveat: this clean comparison covers only 15 days total, so while the result is strong, a longer pilot would make it even more solid.`}</P>
        </Card>
      </section>

      <section id="s10" className="scroll-mt-24 mb-8">
        <Card title="10. Water Use by Hour of Day" description="Real, recurring — likely scheduled equipment, not a data issue.">
          <P>{`While building the hour-of-day usage chart, a consistently large amount of water use showed up between 4 and 5am — hours when the dealership is closed. Checking this day by day, rather than trusting the average alone, rules out a data glitch: nearly every single day in the pilot shows meaningful volume in that window, so it can't be explained by one bad sensor reading.`}</P>
          <P>{`Part of it lines up with the leak: on Sundays (dealership fully closed, the cleanest possible baseline), 4-5am usage was elevated early in the pilot and dropped off right around the leak repair, settling near zero by June — the same decay pattern seen everywhere else. But after the leak was fixed, weekdays still show real volume at 4-5am (2,000-4,400 L) while Sundays that same month sit near zero. If nothing were running except a leak, weekdays and Sundays should look the same post-repair — they don't. That gap points to something scheduled to run on business days specifically during those hours — an irrigation timer or automated cleaning equipment are the most likely explanations, though confirming the source would require checking with the team on-site.`}</P>
        </Card>
      </section>
         </>
  );
}