"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type WeekRow = { week_start: Date; inferred_state: string; avg_volume_l: string };

export default function WeeklyStateTrendChart({ data }: { data: WeekRow[] }) {
  const weekMap = new Map<string, Record<string, string | number>>();
  data.forEach((row) => {
    const week = new Date(row.week_start).toISOString().slice(0, 10);
    if (!weekMap.has(week)) weekMap.set(week, { week });
    weekMap.get(week)![row.inferred_state] = Number(row.avg_volume_l);
  });
  const chartData = Array.from(weekMap.values());

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 10 }}
            label={{ value: "Week", position: "insideBottom", offset: -5, fontSize: 12 }}
          />
          <YAxis
            tickFormatter={(v) => (typeof v === "number" ? v.toFixed(0) : v)}
            label={{ value: "Avg Daily Water Use (Liters)", angle: -90, position: "insideLeft", fontSize: 12 }}
          />
          <Tooltip formatter={(value) => (typeof value === "number" ? value.toFixed(2) : value)} />
          <Legend />
          <Bar dataKey="Bypassed" fill="#ef4444" name="Bypassed" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Engaged" fill="#22c55e" name="Engaged" radius={[3, 3, 0, 0]} />
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}></BarChart>
        </BarChart>
      </ResponsiveContainer>
      <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
        A bar only appears for a week if that state had at least one complete weekday in it. A missing bar means the device ran in the other mode the entire week.
      </p>
    </div>
  );
}