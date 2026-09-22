import { useEffect, useState, type ReactNode } from "react";

export default function FilterGroup({ label, hint, children, onClear, className = "" }: {
  label: string;
  hint?: string;
  children: ReactNode;
  onClear?: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(() => typeof window === "undefined" || !window.matchMedia("(max-width: 767px)").matches);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const sync = () => setOpen(!query.matches);
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return (
    <details data-component="FilterGroup" open={open} onToggle={(event) => setOpen(event.currentTarget.open)} className={`group border-b border-ctp-surface0 pb-2 md:border-0 md:pb-0 ${className}`}>
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg px-1 text-left hover:bg-ctp-surface0/60 [&::-webkit-details-marker]:hidden md:min-h-6 md:pointer-events-none md:px-0 md:hover:bg-transparent">
        <span className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">{label}</span>
        {hint && <span className="text-[11px] text-ctp-overlay1">{hint}</span>}
        {onClear && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ctp-blue md:hidden" />}
        {onClear && (
          <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); onClear(); }} className="ml-auto rounded-full px-2 py-1 text-xs text-ctp-subtext0 hover:bg-ctp-surface0 hover:text-ctp-blue md:pointer-events-auto">
            Clear
          </button>
        )}
        <svg aria-hidden="true" viewBox="0 0 24 24" className="ml-auto h-4 w-4 fill-current text-ctp-subtext0 transition-transform group-open:rotate-180 md:hidden"><path d="m7 10 5 5 5-5H7Z" /></svg>
      </summary>
      <div className="mb-2 mt-1.5 px-1 md:mb-0 md:px-0">{children}</div>
    </details>
  );
}
