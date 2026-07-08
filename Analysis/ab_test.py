"""
Phase 3: Statistical A/B test -- Engaged vs. Bypassed daily water volume.

Restricted to the clean comparison window identified in Phase 2:
  - weekday only (Mon-Fri) -- removes the weekend usage confound
  - 2026-06-01 onward -- removes the leak-decay confound
  - is_complete_day only -- removes days with unreliable low data coverage
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import duckdb
import numpy as np
from scipy import stats

con = duckdb.connect("data/processed/hydroficient.duckdb")

query = """
    SELECT local_date, inferred_state, total_volume_l
    FROM fact_day_summary
    WHERE is_complete_day
      AND day_of_week NOT IN ('Saturday', 'Sunday')
      AND local_date >= '2026-06-01'
    ORDER BY local_date
"""
df = con.execute(query).fetchdf()
print(df.to_string())
print()

bypassed = df.loc[df.inferred_state == "Bypassed", "total_volume_l"].to_numpy()
engaged = df.loc[df.inferred_state == "Engaged", "total_volume_l"].to_numpy()

print(f"Bypassed: n={len(bypassed)}, mean={bypassed.mean():.1f}, std={bypassed.std(ddof=1):.1f}")
print(f"Engaged:  n={len(engaged)}, mean={engaged.mean():.1f}, std={engaged.std(ddof=1):.1f}")

mean_diff = bypassed.mean() - engaged.mean()

# Welch's t-test: does not assume equal variance between groups.
t_stat, p_value = stats.ttest_ind(bypassed, engaged, equal_var=False)

# 95% confidence interval on the mean difference, using the same
# Welch-Satterthwaite standard error the test itself uses.
se = np.sqrt(bypassed.var(ddof=1) / len(bypassed) + engaged.var(ddof=1) / len(engaged))
df_welch = se**4 / (
    (bypassed.var(ddof=1) / len(bypassed)) ** 2 / (len(bypassed) - 1)
    + (engaged.var(ddof=1) / len(engaged)) ** 2 / (len(engaged) - 1)
)
t_crit = stats.t.ppf(0.975, df_welch)
ci_low = mean_diff - t_crit * se
ci_high = mean_diff + t_crit * se

# Cohen's d (pooled standard deviation) -- effect size, independent of sample size.
pooled_std = np.sqrt(
    ((len(bypassed) - 1) * bypassed.var(ddof=1) + (len(engaged) - 1) * engaged.var(ddof=1))
    / (len(bypassed) + len(engaged) - 2)
)
cohens_d = mean_diff / pooled_std

print()
print(f"Mean difference (Bypassed - Engaged): {mean_diff:.1f} L/day")
print(f"95% CI: [{ci_low:.1f}, {ci_high:.1f}]")
print(f"t-statistic: {t_stat:.3f}, p-value: {p_value:.4f}, df (Welch): {df_welch:.2f}")
print(f"Cohen's d: {cohens_d:.2f}")

u_stat, u_pvalue = stats.mannwhitneyu(bypassed, engaged, alternative="two-sided")
print(f"Mann-Whitney U: {u_stat:.1f}, p-value: {u_pvalue:.4f}")