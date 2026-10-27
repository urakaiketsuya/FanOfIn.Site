import { createContext, useContext, useId, useState, type ReactNode } from "react";
import Button from "../../components/ui/Button";
import DisclosureChevron from "../../components/DisclosureChevron";

const ExpansionContext = createContext<{
  expanded: Record<string, boolean>;
  toggle: (title: string) => void;
} | null>(null);

const startsOpen = (title: string) => !/^(sideboard|tokens)$/i.test(title);

/** Owned by the deck viewer so display changes do not reset section choices. */
export function DeckSectionExpansion({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  return <ExpansionContext.Provider value={{ expanded, toggle: title => setExpanded(current => ({
    ...current, [title]: !(current[title] ?? startsOpen(title)),
  })) }}>{children}</ExpansionContext.Provider>;
}

export default function DeckSection({ title, count, price, children }: {
  title: string;
  count: number;
  price?: string;
  children: ReactNode;
}) {
  const id = useId();
  const expansion = useContext(ExpansionContext);
  const [localOpen, setLocalOpen] = useState(() => startsOpen(title));
  const open = expansion ? expansion.expanded[title] ?? startsOpen(title) : localOpen;
  const tokens = title.toLowerCase() === "tokens";
  return <section data-component="DeckSection" className="min-w-0 self-start">
    <h3>
      <Button variant="ghost" aria-expanded={open} aria-controls={`${id}-cards`} id={`${id}-heading`}
        onClick={() => expansion ? expansion.toggle(title) : setLocalOpen(value => !value)}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-left">
        <span className="text-lg font-semibold text-ctp-text">{title}</span>
        <span className="rounded-md bg-ctp-mantle px-2 py-1 text-xs font-normal tabular-nums text-ctp-subtext1">{count} {tokens ? (count === 1 ? "type" : "types") : (count === 1 ? "card" : "cards")}</span>
        <span aria-hidden="true" className="h-px min-w-2 flex-1 bg-ctp-surface1" />
        {price && <span className="text-xs font-normal tabular-nums text-ctp-subtext1">{price}</span>}
        <DisclosureChevron className={`text-ctp-subtext0 ${open ? "" : "-rotate-90"}`} />
      </Button>
    </h3>
    <div id={`${id}-cards`} aria-labelledby={`${id}-heading`} hidden={!open} className="mt-2">{children}</div>
  </section>;
}
