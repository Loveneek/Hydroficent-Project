"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type GateRow = { local_date: Date; avg_pressure_diff: string; std_ga: string };

const round2 = (value: number) => Math.round(value * 100) / 100;

export default function GateActivityChart({ data }: { data: GateRow[] }) {
  const chartData = data.map((d) => ({
    date: new Date(d.local_date).toISOString().slice(0, 10),
    pressure_diff: round2(Number(d.avg_pressure_diff)),
    gate_activity: round2(Number(d.std_ga)),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 9 }} />
        <YAxis yAxisId="left" tickFormatter={(v) => v.toFixed(2)} />
        <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => v.toFixed(2)} />
        <Tooltip formatter={(value: number) => value.toFixed(2)} />
        <Legend />
        <Line yAxisId="left" type="monotone" dataKey="pressure_diff" stroke="#2563eb" name="Pressure Diff (psi)" />
        <Line yAxisId="right" type="monotone" dataKey="gate_activity" stroke="#dc2626" name="Gate Activity (std_ga)" />
      </LineChart>
    </ResponsiveContainer>
  );
}