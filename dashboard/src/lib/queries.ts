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