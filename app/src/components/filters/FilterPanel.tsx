import type { ReactNode } from "react";

export default function FilterPanel({ children, activeCount, onClear, className = "" }: {
  children: ReactNode;
  activeCount: number;
  onClear?: () => void;
  className?: string;
}) {
  return (
    <details data-component="FilterPanel" className={`mt-3 rounded-md border border-ctp-surface1 bg-ctp-mantle/40 px-3 py-2 ${className}`}>
      <summary className="cursor-pointer select-none text-sm font-medium text-ctp-subtext1 hover:text-ctp-text">
        Filters{activeCount > 0 ? ` (${activeCount})` : ""}
      </summary>
      <div className="mt-3 space-y-3">
        {activeCount > 0 && onClear && (
          <div className="flex justify-end">
            <button type="button" onClick={onClear} className="rounded px-2 py-1 text-xs text-ctp-subtext0 hover:bg-ctp-surface0 hover:text-ctp-blue">
              Clear all
            </button>
          </div>
        )}
        {children}
      </div>
    </details>
  );
}
