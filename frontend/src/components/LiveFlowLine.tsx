export function LiveFlowLine() {
  return (
    <span className="relative block h-5 w-16 overflow-hidden">
      <svg
        viewBox="0 0 128 24"
        width="128"
        height="24"
        className="flow-line absolute left-0 top-0 h-5 text-[var(--accent)]"
        fill="none"
      >
        <path
          d="M0 12 L14 12 L18 3 L23 21 L27 10 L32 12 L64 12 L78 12 L82 3 L87 21 L91 10 L96 12 L128 12"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
