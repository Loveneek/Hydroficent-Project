export function LiveDot({ tone = "accent" }: { tone?: "accent" | "critical" }) {
  const color =
    tone === "critical" ? "bg-[var(--critical)]" : "bg-[var(--accent)]";

  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-60`} />
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`} />
    </span>
  );
}
