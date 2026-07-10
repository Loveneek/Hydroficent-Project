"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

type DateRow = { local_date: Date; pct_expected_seconds: string; is_complete_day: boolean };

export default function DataCompletenessChart({ data }: { data: DateRow[] }) {
  const chartData = data.map((d) => ({
    date: new Date(d.local_date).toISOString().slice(0, 10),
    pct: Number(d.pct_expected_seconds) * 100,
    complete: d.is_complete_day,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 8 }} interval={4} />
        <YAxis unit="%" />
        <Tooltip />
        <Bar dataKey="pct" name="% Expected Seconds">
          {chartData.map((entry, index) => (
            <Cell key={index} fill={entry.complete ? "#2563eb" : "#f59e0b"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}