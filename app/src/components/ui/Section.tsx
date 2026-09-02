import type { ElementType, HTMLAttributes, ReactNode } from "react";

export default function Section({
  as: Tag = "section",
  title,
  description,
  actions,
  heading="default",
  children,
  className = "",
  ...props
}: {
  as?: ElementType;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  heading?: "default" | "compact";
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLElement>) {
  return <Tag className={className} {...props}>
    {(title || description || actions) && <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
      <div>
        {title && <h2 className={heading === "compact" ? "text-xs font-semibold uppercase tracking-wide text-ctp-subtext0" : "text-lg font-semibold text-ctp-text"}>{title}</h2>}
        {description && <div className="mt-1 text-sm text-ctp-subtext1">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>}
    {children}
  </Tag>;
}
