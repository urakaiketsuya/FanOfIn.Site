export interface TabOption<T extends string> { key: T; label: string }

export default function Tabs<T extends string>({ tabs, active, onChange, label = "View" }: { tabs: TabOption<T>[]; active: T; onChange: (tab: T) => void; label?: string }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-ctp-surface1" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button key={tab.key} type="button" role="tab" aria-selected={active === tab.key} onClick={() => onChange(tab.key)} className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${active === tab.key ? "border-ctp-blue text-ctp-blue" : "border-transparent text-ctp-subtext1 hover:border-ctp-surface2 hover:text-ctp-text"}`}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
