import { useEffect, useId, useState, type ReactNode } from "react";
import DialogSheet from "../ui/DialogSheet";
import Button from "../ui/Button";
import DisclosureChevron from "../DisclosureChevron";

export default function FilterPanel({ children, activeCount, onClear, activeLabels = [], resultLabel, className = "" }: {
  children: ReactNode; activeCount: number; onClear?: () => void;
  activeLabels?: string[]; resultLabel?: string; className?: string;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(() => window.matchMedia("(max-width: 767px)").matches);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const content = <div id={panelId} className="space-y-3">
    {activeCount > 0 && onClear && <div className="flex justify-end"><Button variant="ghost" onClick={onClear}>Clear all</Button></div>}
    {children}
  </div>;
  return <div data-component="FilterPanel" className={`mt-3 ${className}`}>
    <Button aria-expanded={open} aria-controls={open ? panelId : undefined} aria-haspopup={mobile ? "dialog" : undefined} onClick={event => { event.currentTarget.focus(); setOpen(value => !value); }} className="flex w-full items-center gap-2 text-left">
      Filters {activeCount > 0 && <span className="rounded-full bg-ctp-blue px-2 py-0.5 text-xs text-ctp-base">{activeCount}</span>}
      <DisclosureChevron className={`ml-auto ${open ? "rotate-180" : ""}`} />
    </Button>
    {open && (mobile ? <DialogSheet title="Filters" onDismiss={() => setOpen(false)} footer={<Button variant="primary" className="w-full" onClick={() => setOpen(false)}>{resultLabel ?? "Show results"}</Button>}>{content}</DialogSheet> : <div className="mt-3 rounded-lg border border-ctp-surface1 p-3" onKeyDown={event => { if (event.key === "Escape") { setOpen(false); if (event.currentTarget.previousElementSibling instanceof HTMLElement) event.currentTarget.previousElementSibling.focus(); } }}>{content}</div>)}
    {!open && activeLabels.length > 0 && <div className="mt-2 flex flex-wrap gap-2" aria-label="Active filters">
      {activeLabels.map((label, index) => <span key={`${label}-${index}`} className="rounded-full border border-ctp-blue/60 bg-ctp-blue/10 px-3 py-1.5 text-xs text-ctp-blue">{label}</span>)}
    </div>}
  </div>;
}
