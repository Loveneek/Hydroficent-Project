// Shared visual language: one style object per severity level, and the
// card shell used by every panel across every page.

export const severity = {
  success: {
    text: "text-[var(--success)]",
    bg: "bg-[color:var(--success-soft)]",
    fill: "bg-[var(--success)]",
    stroke: "var(--success)",
  },
  warning: {
    text: "text-[var(--warning)]",
    bg: "bg-[color:var(--warning-soft)]",
    fill: "bg-[var(--warning)]",
    stroke: "var(--warning)",
  },
  critical: {
    text: "text-[var(--critical)]",
    bg: "bg-[color:var(--critical-soft)]",
    fill: "bg-[var(--critical)]",
    stroke: "var(--critical)",
  },
  info: {
    text: "text-[var(--info)]",
    bg: "bg-[color:var(--info-soft)]",
    fill: "bg-[var(--info)]",
    stroke: "var(--info)",
  },
  neutral: {
    text: "text-[var(--text-tertiary)]",
    bg: "bg-white/[0.05]",
    fill: "bg-[var(--text-tertiary)]",
    stroke: "var(--text-tertiary)",
  },
};

export const cardClass =
  "rounded-2xl border border-white/[0.06] bg-[var(--bg-surface)] p-6 shadow-lg shadow-black/20 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.12] hover:shadow-xl hover:shadow-black/30";
