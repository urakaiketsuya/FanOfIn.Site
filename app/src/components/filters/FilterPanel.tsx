import { useEffect, useId, useRef, useState, type ReactNode } from "react";

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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const [open, setOpen] = useState(false);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    const mobile = window.matchMedia("(max-width: 767px)");
    const previousOverflow = document.body.style.overflow;
    const updateScrollLock = () => {
      document.body.style.overflow = mobile.matches ? "hidden" : previousOverflow;
    };
    updateScrollLock();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    mobile.addEventListener("change", updateScrollLock);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      mobile.removeEventListener("change", updateScrollLock);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className={`mt-3 ${className}`}>
      <div
        data-open={open || undefined}
        data-component="FilterPanel"
        className="group rounded-md border border-ctp-surface1 bg-ctp-mantle/40 px-3 py-2 max-md:data-open:fixed max-md:data-open:inset-0 max-md:data-open:z-50 max-md:data-open:flex max-md:data-open:flex-col max-md:data-open:h-dvh max-md:data-open:overflow-hidden max-md:data-open:rounded-none max-md:data-open:border-0 max-md:data-open:bg-ctp-base max-md:data-open:px-4 max-md:data-open:pb-0 max-md:data-open:pt-[max(0.75rem,env(safe-area-inset-top))]"
      >
        <button ref={triggerRef} type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)} className="w-full shrink-0 text-left flex min-h-10 cursor-pointer list-none select-none items-center gap-2 text-sm font-medium text-ctp-subtext1 hover:text-ctp-text [&::-webkit-details-marker]:hidden max-md:rounded-full max-md:border max-md:border-ctp-surface1 max-md:bg-ctp-surface0 max-md:px-4 max-md:shadow-sm max-md:group-data-open:rounded-none max-md:group-data-open:border-0 max-md:group-data-open:bg-transparent max-md:group-data-open:px-0 max-md:group-data-open:text-base max-md:group-data-open:font-semibold max-md:group-data-open:text-ctp-text max-md:group-data-open:shadow-none">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M4 5h16v2H4V5Zm3 6h10v2H7v-2Zm3 6h4v2h-4v-2Z" /></svg>
          <span>Filters</span>
          {activeCount > 0 && <span className="rounded-full bg-ctp-blue px-2 py-0.5 text-xs font-semibold text-ctp-base">{activeCount}</span>}
          <span className="ml-auto hidden text-sm font-normal text-ctp-blue max-md:group-data-open:inline">Close</span>
        </button>
        {open && <div id={panelId} className="mt-3 min-h-0 space-y-3 max-md:flex-1 max-md:overflow-y-auto max-md:overscroll-contain max-md:pb-5">
          <div className="flex items-center justify-between md:justify-end">
            <p className="hidden text-xs font-medium uppercase tracking-wide text-ctp-subtext0 max-md:block">Refine results</p>
            {activeCount > 0 && onClear && (
              <button type="button" onClick={onClear} className="rounded-full px-3 py-2 text-xs font-medium text-ctp-blue hover:bg-ctp-blue/10">
                Clear all
              </button>
            )}
          </div>
          {children}
        </div>}
        {open && <div className="-mx-4 mt-auto hidden shrink-0 border-t border-ctp-surface1 bg-ctp-base px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 max-md:block">
          <button type="button" onClick={close} className="min-h-12 w-full rounded-full bg-ctp-blue px-5 py-3 text-sm font-semibold text-ctp-base shadow-lg hover:bg-ctp-sapphire focus:outline-none focus:ring-2 focus:ring-ctp-blue focus:ring-offset-2 focus:ring-offset-ctp-base">
            {resultLabel ?? "Show results"}
          </button>
        </div>}
      </div>
      {!open && activeLabels.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 md:hidden" aria-label="Active filters">
          {activeLabels.map((label, index) => <span key={`${label}-${index}`} className="shrink-0 rounded-full border border-ctp-blue/60 bg-ctp-blue/10 px-3 py-1.5 text-xs font-medium text-ctp-blue">{label}</span>)}
        </div>
      )}
    </div>
  );
}
