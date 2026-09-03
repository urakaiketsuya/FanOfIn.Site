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
  collapsible = false,
  defaultOpen = true,
  onOpen,
  children,
  className = "",
  ...props
}: {
  as?: ElementType;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  heading?: SectionHeading;
  /** Renders the header as a native `<details>/<summary>` disclosure so `children` can be
   * collapsed. Header markup (title/description/actions) is unchanged — every existing
   * non-collapsible call site is unaffected. */
  collapsible?: boolean;
  /** Only read on mount (native `<details open>` is uncontrolled) — irrelevant when `collapsible` is false. */
  defaultOpen?: boolean;
  /** Fires the first (and every) time this section is expanded. `collapsible` alone only hides
   * `children` visually — React still renders/computes them while closed. Pair this with lazily
   * mounting expensive `children` (render `null` until `onOpen` has fired once) for a section
   * whose data nothing outside it depends on, so that data isn't computed until actually viewed.
   * Only fires on a user-driven open — it does not fire for `defaultOpen`'s initial state, so a
   * lazy consumer should only combine this with `defaultOpen={false}` (initialize its own "has
   * this opened" state to match `defaultOpen` otherwise). */
  onOpen?: () => void;
  children: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, "title">) {
  const header = (title || description) && <div>
    {title && <h2 className={TITLE_CLASS[heading]}>{title}</h2>}
    {description && <div className={DESCRIPTION_CLASS[heading]}>{description}</div>}
  </div>;

  if (collapsible) {
    return <Tag className={className} {...props}>
      <details
        open={defaultOpen}
        className="group"
        onToggle={onOpen ? (e) => { if ((e.currentTarget as HTMLDetailsElement).open) onOpen(); } : undefined}
      >
        <summary className="mb-3 flex flex-wrap cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <div className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-1 shrink-0 text-ctp-subtext0 transition-transform group-open:rotate-90">&#9656;</span>
            {header}
          </div>
          {/* stopPropagation so interactive actions (links/buttons/selects) don't also toggle the details */}
          {actions && <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>{actions}</div>}
        </summary>
        {children}
      </details>
    </Tag>;
  }

  return <Tag className={className} {...props}>
    {(title || description || actions) && <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
      {header}
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>}
    {children}
  </Tag>;
}
