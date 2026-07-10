"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Overview" },
  { href: "/trends", label: "Trends & Classifier" },
  { href: "/anomalies", label: "Anomalies" },
  { href: "/leak-quality", label: "Leak & Data Quality" },
];

export default function NavTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 bg-neutral-900/60 border border-neutral-800 rounded-full p-1 w-fit mb-8">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
              active ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-neutral-100"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}