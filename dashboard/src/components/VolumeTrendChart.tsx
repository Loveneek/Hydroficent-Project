"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type DayRow = {
  local_date: Date;
  total_volume_l: string;
  inferred_state: string;
  is_complete_day: boolean;
};

export default function VolumeTrendChart({ data }: { data: DayRow[] }) {
  const chartData = data
    .filter((d) => d.is_complete_day)
    .map((d) => ({
      date: new Date(d.local_date).toISOString().slice(0, 10),
      volume: Number(d.total_volume_l),
      state: d.inferred_state,
    }));
  // ... rest stays exactly the same

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="volume" stroke="#2563eb" dot={false} name="Daily Volume (L)" />
      </LineChart>
    </ResponsiveContainer>
  );
}