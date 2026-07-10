import { LucideIcon } from "lucide-react";

export default function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  accent = "blue",
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  accent?: "blue" | "green" | "amber";
}) {
  const accentClasses = {
    blue: "text-blue-400 bg-blue-500/10",
    green: "text-emerald-400 bg-emerald-500/10",
    amber: "text-amber-400 bg-amber-500/10",
  }[accent];

  return (
    <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accentClasses}`}>
        <Icon size={18} />
      </div>
      <div>
        <div className="text-sm text-neutral-400">{label}</div>
        <div className="text-2xl font-bold text-neutral-50">{value}</div>
        <div className="text-xs text-neutral-500 mt-1">{detail}</div>
      </div>
    </div>
  );
}