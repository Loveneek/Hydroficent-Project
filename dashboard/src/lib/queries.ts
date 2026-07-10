import pool from "./db";

export async function getDailyVolumeTrend() {
  const result = await pool.query(`
    SELECT local_date, total_volume_l, inferred_state, era, is_complete_day
    FROM fact_day_summary
    ORDER BY local_date
  `);
  return result.rows;
}

export async function getDataQualitySummary() {
  const result = await pool.query(`
    SELECT issue_type, count(*) AS n_days, sum(n_affected) AS total_seconds
    FROM data_quality_log
    GROUP BY issue_type
    ORDER BY issue_type
  `);
  return result.rows;
}

export async function getEngagedVsBypassedSummary() {
  const result = await pool.query(`
    SELECT inferred_state, era, count(*) AS n_days,
           round(avg(total_volume_l)::numeric, 1) AS avg_volume_l
    FROM fact_day_summary
    WHERE is_complete_day
    GROUP BY inferred_state, era
    ORDER BY era, inferred_state
  `);
  return result.rows;
}

export async function getWeeklyStateTrend() {
  const result = await pool.query(`
    SELECT
      date_trunc('week', local_date) AS week_start,
      inferred_state,
      round(avg(total_volume_l)::numeric, 1) AS avg_volume_l
    FROM fact_day_summary
    WHERE is_complete_day
      AND day_of_week NOT IN ('Saturday', 'Sunday')
    GROUP BY 1, 2
    ORDER BY 1, 2
  `);
  return result.rows;
}

export async function getDataCompleteness() {
  const result = await pool.query(`
    SELECT local_date, day_of_week, pct_expected_seconds, is_complete_day
    FROM dim_date
    ORDER BY local_date
  `);
  return result.rows;
}

export async function getGateActivityTrend() {
  const result = await pool.query(`
    SELECT local_date, avg_pressure_diff, std_ga
    FROM fact_day_summary
    WHERE inferred_state = 'Engaged' AND is_complete_day
    ORDER BY local_date
  `);
  return result.rows;
}

export async function getClassifierDistribution() {
  const result = await pool.query(`
    SELECT local_date, std_ga, inferred_state
    FROM fact_day_summary
    ORDER BY std_ga
  `);
  return result.rows;
}

export async function getSundayLeakComparison() {
  const result = await pool.query(`
    SELECT era, round(avg(total_volume_l)::numeric, 1) AS avg_sunday_volume_l, count(*) AS n_sundays
    FROM fact_day_summary
    WHERE day_of_week = 'Sunday' AND is_complete_day
    GROUP BY era
    ORDER BY era
  `);
  return result.rows;
}