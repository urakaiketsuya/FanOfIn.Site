import type { ReactNode } from "react";

export default function FilterBar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-wrap items-end gap-3 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3 ${className}`}>{children}</div>;
}
