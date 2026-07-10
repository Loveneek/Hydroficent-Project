"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

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
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="week" tick={{ fontSize: 10 }} />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="Bypassed" stroke="#ef4444" name="Bypassed" />
        <Line type="monotone" dataKey="Engaged" stroke="#22c55e" name="Engaged" />
      </LineChart>
    </ResponsiveContainer>
  );
}