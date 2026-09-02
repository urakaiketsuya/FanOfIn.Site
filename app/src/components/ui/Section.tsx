import type { ElementType, HTMLAttributes, ReactNode } from "react";

type SectionHeading = "default" | "compact" | "dense";

/** "compact" (text-sm title) and "dense" (text-xs title) are both real, independently-established
 * conventions in the app — not one right size and one mistake. "compact" matches page-level
 * subsections (e.g. Champions' "Named Spirits", Champion Detail's tab headers); "dense" matches
 * smaller nested widget headers (e.g. Guided Deck Builder panels) — dense headers are ~1.7x more
 * common app-wide, so don't assume compact is the default "small heading" choice. */
const TITLE_CLASS: Record<SectionHeading, string> = {
  default: "text-lg font-semibold text-ctp-text",
  compact: "text-sm font-semibold uppercase tracking-wide text-ctp-subtext0",
  dense: "text-xs font-semibold uppercase tracking-wide text-ctp-subtext0",
};

const DESCRIPTION_CLASS: Record<SectionHeading, string> = {
  default: "mt-1 text-sm text-ctp-subtext1",
  compact: "mt-1 text-xs text-ctp-subtext0",
  dense: "mt-1 text-xs text-ctp-subtext0",
};

export default function Section({
  as: Tag = "section",
  title,
  description,
  actions,
  heading = "default",
  children,
  className = "",
  ...props
}: {
  as?: ElementType;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  heading?: SectionHeading;
  children: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, "title">) {
  return <Tag className={className} {...props}>
    {(title || description || actions) && <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
      <div>
        {title && <h2 className={TITLE_CLASS[heading]}>{title}</h2>}
        {description && <div className={DESCRIPTION_CLASS[heading]}>{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>}
    {children}
  </Tag>;
}
