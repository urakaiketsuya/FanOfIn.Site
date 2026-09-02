import type { ReactNode } from "react";

type StateTone = "muted" | "danger";

export function InlineState({ children, tone = "muted", className = "" }: { children: ReactNode; tone?: StateTone; className?: string }) {
  return <p className={`${tone === "danger" ? "text-ctp-red" : "text-ctp-subtext1"} ${className}`}>{children}</p>;
}

export function EmptyState({ title, description, action, className = "" }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-dashed border-ctp-surface1 p-8 text-center ${className}`}>
    <p className="font-medium text-ctp-text">{title}</p>
    {description && <div className="mx-auto mt-1 max-w-xl text-sm text-ctp-subtext1">{description}</div>}
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>;
}
