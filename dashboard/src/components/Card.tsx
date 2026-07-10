import { ReactNode } from "react";

export default function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 mb-8 shadow-sm">
      <h2 className="text-base font-semibold text-neutral-100 mb-1">{title}</h2>
      {description && <p className="text-xs text-neutral-400 mb-4">{description}</p>}
      {children}
    </section>
  );
}