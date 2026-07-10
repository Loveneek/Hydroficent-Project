"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type LeakRow = { era: string; avg_sunday_volume_l: string };

export default function LeakComparisonChart({ data }: { data: LeakRow[] }) {
  const chartData = data.map((d) => ({
    era: d.era,
    volume: Number(d.avg_sunday_volume_l),
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="era" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="volume" name="Avg Sunday Volume (L)" fill="#2563eb" />
      </BarChart>
    </ResponsiveContainer>
  );
}