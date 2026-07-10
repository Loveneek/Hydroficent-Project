"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

type ClassifierRow = { std_ga: string; inferred_state: string };

export default function ClassifierDistributionChart({ data }: { data: ClassifierRow[] }) {
  const chartData = data.map((d, i) => ({
    index: i,
    std_ga: Number(d.std_ga),
    state: d.inferred_state,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="index" tick={false} />
        <YAxis />
        <Tooltip />
        <Bar dataKey="std_ga" name="Gate Activity (std_ga)" minPointSize={3}>
        {chartData.map((entry, index) => (
            <Cell key={index} fill={entry.state === "Bypassed" ? "#ef4444" : "#22c55e"} />
        ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}