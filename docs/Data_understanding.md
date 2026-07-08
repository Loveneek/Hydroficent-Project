# Data Understanding — Hydroficient HYDROLOGIC Pilot

## 1. Source & Context

- Device: Hydroficient HYDROLOGIC water-management unit
- Site: Pfaff Audi Newmarket dealership
- Operation: device alternated between "Engaged" and "Bypassed" states during the pilot
- Confound: a leak was repaired partway through the pilot (~2026-05-04), splitting the
  data into `pre_repair` / `post_repair` eras that must be analyzed separately, not pooled

## 2. Raw Data

- 7 CSV files, exported as Parquet in the extract stage
- 4,977,194 raw rows extracted; 4,976,552 rows after deduplication
- Grain: 1 reading per second, with 10 Hz sub-samples (10 readings/sec) for pressure
  (`up`, `dp`) and gate angle (`ga`), collapsed to mean/std/min/max per second
- 63 calendar days present in the export
- Local time = UTC - 4h (whole window is EDT, no DST boundary crossed)
- Dealership closed Sundays → `is_business_day` excludes Sundays only (Saturdays are
  reduced-hours but still open)

## 3. Key Findings

### 3.1 Dead columns
Gate B and modem telemetry columns are constant/unused across the whole export and
are dropped in the transform stage.

### 3.2 Engaged vs. Bypassed classification (preliminary)
No explicit state column exists in the raw data — state is inferred from gate
activity. Current heuristic: a day is "Engaged" if `std_ga` (daily std dev of gate
angle) exceeds `GATE_A_ACTIVE_STD_THRESHOLD` (0.05), else "Bypassed". This is a
placeholder pending Phase 2 validation (e.g. clustering/GMM) with a confidence score
per day instead of a hard boolean.

### 3.3 Counter reset
`postotal` (cumulative volume counter) resets to 0 once, around 2026-06-01. A naive
`max(postotal) - min(postotal)` over a window containing the reset produces a wildly
wrong result (~1,000+ units). Fixed via clamped positive deltas:
`GREATEST(postotal - LAG(postotal) OVER (ORDER BY ts), 0)` — self-heals across the
reset because the delta at the reset row is clamped to 0 and every row after resumes
normal small positive deltas.

### 3.4 Duplicate timestamps
642 rows across 44 distinct days share a timestamp with another row (retransmission
duplicates). Deduplicated deterministically via
`ROW_NUMBER() OVER (PARTITION BY ts ORDER BY filename) = 1`.

### 3.5 Data quality audit (data_quality_log table)
Rather than silently dropping anything, a dedicated audit table logs every row
excluded or flagged, with a reason, per day:

| issue_type | days affected | rows affected |
|---|---|---|
| duplicate_timestamp | 44 | 642 |
| counter_reset | 1 | 1 |
| pressure_out_of_range (0–200 psi) | 0 | 0 |
| temperature_out_of_range (-10–50°C) | 0 | 0 |
| negative_flow | 0 | 0 |

Takeaway: the device's sensor readings themselves are clean across ~5M rows — no
physically implausible pressure, temperature, or flow values were ever recorded. The
only irregularities are explainable transmission duplicates and one expected meter
rollover, both handled correctly and now fully traceable.
### 3.5 Data quality audit (data_quality_log table)
Rather than silently dropping anything, a dedicated audit table logs every row
excluded or flagged, with a reason, per day:

| issue_type | days affected | rows affected |
|---|---|---|
| duplicate_timestamp | 44 | 642 |
| counter_reset | 1 | 1 |
| implausible_volume_jump | 1 | 1 |
| pressure_out_of_range (0–200 psi) | 0 | 0 |
| temperature_out_of_range (-10–50°C) | 0 | 0 |
| negative_flow | 0 | 0 |

Takeaway: across ~5M rows, the device's sensor readings are clean. The only
irregularities are explainable transmission duplicates, one meter rollover, and
one single-second sensor glitch (see 3.6) — all handled correctly and fully
traceable.

### 3.6 The June 1 volume glitch (found and fixed)
The known counter reset on 2026-06-01 initially produced a day total of
1,116,538 L — ~50x every other day. Investigation showed `postotal` held
steady, dropped to 0 for exactly one second (correctly clamped by the reset
handling), then jumped back to its prior value on the very next second while
`flow` read 0.0 throughout — a single bad reading, not real usage.

Fix required two iterations:
1. First attempt capped any single-row delta above a flat 20 L threshold. This
   overcorrected: 198 seconds across 36 days were flagged, because many
   deltas reflect legitimate "catch-up" volume after ordinary telemetry gaps
   (median gap 1000ms, but ~63k rows have shorter gaps, some down to 179ms).
2. Final fix uses a *rate* check instead: volume_delta_l / max(gap_seconds, 1.0)
   compared against `MAX_PLAUSIBLE_FLOW_RATE_L_PER_SEC` (5.0 L/s, vs. a real
   observed sensor max of 1.926 L/s). The 1-second floor on the gap accounts
   for timestamp jitter rather than genuine sub-second sampling. This isolates
   exactly the one true glitch (rate 1,092,406 L/s) with zero false positives.

June 1's corrected total_volume_l: 24,132 L — in line with every other day.

### 3.7 Leak cost quantification
Using Sunday volumes (dealership closed, so ~all volume is leak, not business
use) before vs. after the 2026-05-04 repair:

| era | n_sundays | avg_sunday_volume_l | std_daily_volume_l |
|---|---|---|---|
| pre_repair | 3 | 24,046.0 | 11,523.2 |
| post_repair | 5 | 8,523.4 | 6,573.5 |

Estimated leak rate: 24,046.0 - 8,523.4 = **15,522.6 L/day**.

Cost over the 15 complete pre-repair days in this dataset: 15 x 15,522.6 L =
232,839 L = 232.839 m3 x 5.039 CAD/m3 = **≈ $1,173 CAD**.

Caveats:
- Lower bound only -- the leak may predate the pilot's data window (starts
  2026-04-18/19), so true total cost is likely higher.
- Small sample (3 vs. 5 Sundays) with high variance -- one standard error puts
  the true daily leak rate anywhere from roughly 8,000-23,000 L/day.

### 3.8 Time trend across the pilot
Weekly average business-day (Mon-Fri) volume, split by inferred_state, shows
the same shape in both groups independently -- ruling out a state-mix
confound:

| week_start | Bypassed avg L/day | Engaged avg L/day |
|---|---|---|
| 04-20 | 49,242 | 43,240 |
| 04-27 | 43,127 | 33,242 |
| 05-04 | 25,509 | 14,258 |
| 05-11 | 20,231 | 14,676 |
| 05-18 | 16,152 | 16,093 |
| 05-25 | 23,259 (n=1, unreliable) | -- |
| 06-01 | 23,984 | 18,245 |
| 06-08 | 22,562 | 17,151 |
| 06-15 | 22,966 | 15,813 |

Two findings:

1. **The leak didn't stop instantly at the 2026-05-04 repair date.** Volume in
   both states kept declining for ~3 more weeks, only stabilizing around
   05-25/06-01. The repair date is a useful era boundary for labeling, but not
   a clean before/after step -- there was a "transitional" decay period.
2. **Once stabilized (June onward), the device effect is clear and
   consistent.** Every week from 06-01 on: Bypassed > Engaged by roughly
   5,400-7,150 L/day (~25-30%), on weekday-only, leak-settled data. This is a
   cleaner signal than the original pooled era comparison since it excludes
   both the leak-decay period and the weekday/weekend confound.

### 3.9 Data completeness gap
`dim_date` has 63 rows, but the pilot window spans 64 calendar days
(2026-04-18 to 2026-06-20) -- **2026-05-24 is missing from the data entirely**,
not just partial.

Non-complete days breakdown:
- 04-18 (33%) and 06-20 (67%) -- expected: first/last day of the export,
  data starts/ends partway through. Not a real issue.
- 05-13 (69%) -- an isolated single-day dip, normal days on both sides.
- 05-23 to 05-30 cluster: 19%, 0% (missing), 78%, **05-26 at 98% (fully
  fine)**, 27%, 17%, 30%, 50%, then back to 100% on 05-31.

The late-May cluster shows uneven, partial percentages with one fully healthy
day in the middle (05-26) rather than a flat 0% for the whole stretch --
this points to intermittent connectivity (device/uplink flaking in and out
over about a week), not one continuous outage. Affects ~13% of the pilot
window. This is a completeness issue (missing seconds), distinct from the
correctness issues in 3.5/3.6 (duplicates, the volume glitch).

### 3.10 Gate activity vs. pressure differential (possible wear signal)
Comparing two stable, leak-settled periods on Engaged days:

| period | avg_pressure_diff (psi) | avg std_ga | pressure per unit gate movement |
|---|---|---|---|
| May (05-05 to 05-21, n=7) | 2.88 | 1.34 | 2.15 |
| June (06-02 to 06-18, n=8) | 3.42 | 3.73 | 0.92 |

Gate activity (std_ga) nearly tripled from May to June while the pressure
differential achieved stayed the same or improved slightly -- a >50% drop in
"pressure per unit of gate movement." The gate needs substantially more
movement over time to produce the same effect. This is a real pattern in the
telemetry; confirming the mechanical cause (wear, friction, valve condition)
would require physical inspection, which is outside the scope of this data.

## 4. Phase 3: Statistical A/B Test Results

Comparing daily volume, Engaged vs. Bypassed, on the clean window identified in
Phase 2 (weekday-only, leak-settled, 2026-06-01 onward, complete days only):

| state | n | mean L/day | std |
|---|---|---|---|
| Bypassed | 8 | 23,246.6 | 1,221.7 |
| Engaged | 7 | 17,081.0 | 3,167.2 |

- Mean difference: 6,165.6 L/day (Bypassed - Engaged), a ~26.5% reduction
- Welch's t-test: t=4.845, p=0.0015, 95% CI [3,200.5, 9,130.8]
- Mann-Whitney U (non-parametric confirmation): U=56 (the maximum possible
  value for n=8,7 -- every Bypassed day exceeded every Engaged day), p=0.0003
- Effect size: Cohen's d=2.65 (very large; conventional benchmarks are
  0.2/0.5/0.8 for small/medium/large)

**Conclusion:** on this clean, confound-controlled window, the device produces
a real, statistically significant reduction in daily water use of roughly 26%.
The two groups show complete rank separation (no overlap at all), and both a
parametric and non-parametric test agree. Caveat: based on only 15 total days
(8 vs. 7) -- the direction and rough magnitude are solid, but a longer pilot
would tighten the confidence interval.