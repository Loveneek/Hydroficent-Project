"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type HourRow = { hour_of_day: number; inferred_state: string; avg_volume_l: string; n_days: number };

export default function HourlyPatternChart({ data }: { data: HourRow[] }) {
  const hourMap = new Map<number, Record<string, number>>();
  data.forEach((row) => {
    const hour = Number(row.hour_of_day);
    if (!hourMap.has(hour)) hourMap.set(hour, { hour });
    hourMap.get(hour)![row.inferred_state] = Number(row.avg_volume_l);
  });
  const chartData = Array.from(hourMap.values()).sort((a, b) => a.hour - b.hour);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="hour"
          tick={{ fontSize: 10 }}
          label={{ value: "Hour of Day", position: "insideBottom", offset: -5, fontSize: 12 }}
        />
        <YAxis
          tickFormatter={(v) => (typeof v === "number" ? v.toFixed(0) : v)}
          label={{ value: "Avg Water Use (Liters)", angle: -90, position: "insideLeft", fontSize: 12 }}
        />
        <Tooltip formatter={(value) => (typeof value === "number" ? value.toFixed(2) : value)} />
        <Legend />
        <Line type="monotone" dataKey="Bypassed" stroke="#ef4444" name="Bypassed" dot={{ r: 2 }} />
        <Line type="monotone" dataKey="Engaged" stroke="#22c55e" name="Engaged" dot={{ r: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}