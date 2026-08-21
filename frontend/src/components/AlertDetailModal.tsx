import { X } from "lucide-react";
import { severity } from "../theme";
import type { AlertRecord } from "../types";

export function AlertDetailModal({
  alert,
  onClose,
}: {
  alert: AlertRecord;
  onClose: () => void;
}) {
  const { title, time, action, severity: sev, status } = alert;
  const style = severity[sev];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
              Alert Detail
            </p>
            <h3 className="mt-1 text-xl font-bold tracking-tight">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style.bg} ${style.text}`}>
            {sev.charAt(0).toUpperCase() + sev.slice(1)}
          </span>
          <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-xs font-semibold text-[var(--text-tertiary)]">
            {status}
          </span>
          <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-xs font-semibold text-[var(--text-tertiary)]">
            {time}
          </span>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">{action}</p>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-white/[0.06] py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors duration-150 hover:bg-white/[0.1]"
        >
          Close
        </button>
      </div>
    </div>
  );
}
