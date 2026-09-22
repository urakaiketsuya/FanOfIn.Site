import type { ReactNode } from "react";

export default function FilterGroup({ label, hint, children, onClear, className = "" }: {
  label: string;
  hint?: string;
  children: ReactNode;
  onClear?: () => void;
  className?: string;
}) {
  return (
    <fieldset data-component="FilterGroup" className={className}>
      <legend className="sr-only">{label}</legend>
      <div className="flex min-h-6 items-center gap-2">
        <span aria-hidden="true" className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">{label}</span>
        {hint && <span className="text-[11px] text-ctp-overlay1">{hint}</span>}
        {onClear && (
          <button type="button" onClick={onClear} className="ml-auto rounded px-1.5 py-0.5 text-xs text-ctp-subtext0 hover:bg-ctp-surface0 hover:text-ctp-blue">
            Clear
          </button>
        )}
      </div>
      <div className="mt-1.5">{children}</div>
    </fieldset>
  );
}
