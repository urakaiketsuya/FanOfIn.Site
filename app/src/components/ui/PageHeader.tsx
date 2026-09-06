import type { ReactNode } from "react";

export default function PageHeader({ title, description, eyebrow, actions }: { title: string; description?: ReactNode; eyebrow?: ReactNode; actions?: ReactNode }) {
  return (
    <header data-component="PageHeader" className="mb-6">
      {eyebrow && <div className="mb-2 text-sm text-ctp-blue">{eyebrow}</div>}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-ctp-text">{title}</h1>
          {description && <div className="mt-2 text-sm leading-6 text-ctp-subtext1">{description}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
