import { useEffect, useRef, useState, type ReactNode } from "react";

export default function FilterPanel({ children, activeCount, onClear, activeLabels = [], resultLabel, className = "" }: {
  children: ReactNode;
  activeCount: number;
  onClear?: () => void;
  /** Compact summaries shown as horizontally-scrollable Material-style chips on mobile. */
  activeLabels?: string[];
  /** Mobile sheet action label. Defaults to "Show results". */
  resultLabel?: string;
  className?: string;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || !window.matchMedia("(max-width: 767px)").matches) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && detailsRef.current) detailsRef.current.open = false;
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className={`mt-3 ${className}`}>
      <details
        ref={detailsRef}
        data-component="FilterPanel"
        onToggle={(event) => setOpen(event.currentTarget.open)}
        className="group rounded-md border border-ctp-surface1 bg-ctp-mantle/40 px-3 py-2 max-md:open:fixed max-md:open:inset-0 max-md:open:z-50 max-md:open:flex max-md:open:flex-col max-md:open:rounded-none max-md:open:border-0 max-md:open:bg-ctp-base max-md:open:px-4 max-md:open:pb-0 max-md:open:pt-[max(0.75rem,env(safe-area-inset-top))]"
      >
        <summary className="flex min-h-10 cursor-pointer list-none select-none items-center gap-2 text-sm font-medium text-ctp-subtext1 hover:text-ctp-text [&::-webkit-details-marker]:hidden max-md:rounded-full max-md:border max-md:border-ctp-surface1 max-md:bg-ctp-surface0 max-md:px-4 max-md:shadow-sm max-md:group-open:rounded-none max-md:group-open:border-0 max-md:group-open:bg-transparent max-md:group-open:px-0 max-md:group-open:text-base max-md:group-open:font-semibold max-md:group-open:text-ctp-text max-md:group-open:shadow-none">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M4 5h16v2H4V5Zm3 6h10v2H7v-2Zm3 6h4v2h-4v-2Z" /></svg>
          <span>Filters</span>
          {activeCount > 0 && <span className="rounded-full bg-ctp-blue px-2 py-0.5 text-xs font-semibold text-ctp-base">{activeCount}</span>}
          <span className="ml-auto hidden text-sm font-normal text-ctp-blue max-md:group-open:inline">Close</span>
        </summary>
        <div className="mt-3 space-y-3 max-md:min-h-0 max-md:flex-1 max-md:overflow-y-auto max-md:pb-5">
          <div className="flex items-center justify-between md:justify-end">
            <p className="hidden text-xs font-medium uppercase tracking-wide text-ctp-subtext0 max-md:block">Refine results</p>
            {activeCount > 0 && onClear && (
              <button type="button" onClick={onClear} className="rounded-full px-3 py-2 text-xs font-medium text-ctp-blue hover:bg-ctp-blue/10">
                Clear all
              </button>
            )}
          </div>
          {children}
        </div>
        <div className="sticky bottom-0 -mx-4 mt-auto hidden border-t border-ctp-surface1 bg-ctp-base px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 max-md:block">
          <button type="button" onClick={() => { if (detailsRef.current) detailsRef.current.open = false; }} className="min-h-12 w-full rounded-full bg-ctp-blue px-5 py-3 text-sm font-semibold text-ctp-base shadow-lg hover:bg-ctp-sapphire focus:outline-none focus:ring-2 focus:ring-ctp-blue focus:ring-offset-2 focus:ring-offset-ctp-base">
            {resultLabel ?? "Show results"}
          </button>
        </div>
      </details>
      {!open && activeLabels.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 md:hidden" aria-label="Active filters">
          {activeLabels.map((label, index) => <span key={`${label}-${index}`} className="shrink-0 rounded-full border border-ctp-blue/60 bg-ctp-blue/10 px-3 py-1.5 text-xs font-medium text-ctp-blue">{label}</span>)}
        </div>
      )}
    </div>
  );
}
