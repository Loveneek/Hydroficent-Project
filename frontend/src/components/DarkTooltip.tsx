type TooltipPayloadItem = {
  dataKey?: string | number;
  name?: string | number;
  value?: string | number;
};

type DarkTooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
};

export function DarkTooltip({ active, payload, label }: DarkTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[rgba(18,27,46,0.92)] px-3 py-2 text-sm shadow-xl shadow-black/30 backdrop-blur">
      <p className="mb-1 text-xs text-[var(--text-tertiary)]">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey ?? item.name} className="font-semibold text-[var(--text-primary)]">
          {item.name || item.dataKey}: {item.value}
        </p>
      ))}
    </div>
  );
}
