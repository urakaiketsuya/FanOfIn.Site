import { useRef, type KeyboardEvent, type ReactNode } from "react";

export interface TabOption<T extends string> { key: T; label: string }

export default function Tabs<T extends string>({ tabs, active, onChange, label = "View", baseId }: { tabs: TabOption<T>[]; active: T; onChange: (tab: T) => void; label?: string; baseId?: string }) {
  const tablistRef = useRef<HTMLDivElement>(null);

  // Roving-tabindex tabs per the WAI-ARIA pattern: only the active tab is in the tab order, and
  // arrow/Home/End keys move focus *and* selection. `baseId` is optional — when a caller provides
  // it, each tab also gets an `id`/`aria-controls` that a sibling `role="tabpanel"` can target
  // (`${baseId}-panel-${key}`); existing callers keep working unchanged without it.
  function moveFocus(index: number) {
    const buttons = tablistRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[index]?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next === null) return;
    e.preventDefault();
    onChange(tabs[next].key);
    moveFocus(next);
  }

  return (
    <div data-component="Tabs" ref={tablistRef} className="flex max-w-full gap-1 overflow-x-auto overscroll-x-contain scroll-smooth border-b border-ctp-surface1" role="tablist" aria-label={label}>
      {tabs.map((tab, index) => {
        const selected = active === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={baseId ? `${baseId}-tab-${tab.key}` : undefined}
            aria-selected={selected}
            aria-controls={baseId ? `${baseId}-panel-${tab.key}` : undefined}
            tabIndex={selected ? 0 : -1}
            onClick={(event) => { onChange(tab.key); event.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }); }}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${selected ? "border-ctp-blue text-ctp-blue" : "border-transparent text-ctp-subtext1 hover:border-ctp-surface2 hover:text-ctp-text"}`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/** Pairs with `Tabs baseId` so callers do not have to reproduce panel ids and ARIA wiring. */
export function TabPanel<T extends string>({ baseId, tab, active, children, className = "", keepMounted = false }: { baseId: string; tab: T; active: T; children: ReactNode; className?: string; keepMounted?: boolean }) {
  const selected = tab === active;
  if (!selected && !keepMounted) return null;
  return <div
    role="tabpanel"
    id={`${baseId}-panel-${tab}`}
    aria-labelledby={`${baseId}-tab-${tab}`}
    tabIndex={0}
    hidden={!selected}
    className={className}
  >
    {children}
  </div>;
}
