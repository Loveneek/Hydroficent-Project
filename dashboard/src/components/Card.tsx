import { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Card({
  title,
  description,
  findingHref,
  children,
}: {
  title: string;
  description?: string;
  findingHref?: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 mb-8 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-1">
        <h2 className="text-base font-semibold text-neutral-100">{title}</h2>
        {findingHref && (
          <Link
            href={findingHref}
            className="flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 whitespace-nowrap shrink-0"
          >
            Read the finding
            <ArrowRight size={12} />
          </Link>
        )}
      </div>
      {description && <p className="text-xs text-neutral-400 mb-4">{description}</p>}
      {children}
    </section>
  );
}