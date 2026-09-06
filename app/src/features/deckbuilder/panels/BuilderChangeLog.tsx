import type { ChangeLogEntry } from "../model/builderTypes";
import Section from "../../../components/ui/Section";

export default function BuilderChangeLog({ entries }: { entries: ChangeLogEntry[] }) {
  if (entries.length === 0) return null;
  return <Section data-component="BuilderChangeLog" className="mt-6" heading="dense" title="Suggestion changes">
    <ul className="mt-2 space-y-1 text-xs text-ctp-subtext1">
      {entries.map((entry, index) => <li key={index}>
        <span className="text-ctp-text">{entry.label}</span>
        {entry.winRateDelta !== null && Math.abs(entry.winRateDelta) >= 0.001 && <span className={`ml-1.5 font-semibold ${entry.winRateDelta >= 0 ? "text-ctp-green" : "text-ctp-red"}`}>
          (observed matching-deck rate {entry.winRateDelta >= 0 ? "+" : ""}{(entry.winRateDelta * 100).toFixed(1)}%)
        </span>}
        {entry.added.length === 0 && entry.removed.length === 0
          ? <span className="text-ctp-subtext0"> — no change to the rest of the suggestions</span>
          : <>{entry.added.map((name) => <span key={`+${name}`} className="ml-1.5 text-ctp-green">+{name}</span>)}{entry.removed.map((name) => <span key={`-${name}`} className="ml-1.5 text-ctp-red">−{name}</span>)}</>}
      </li>)}
    </ul>
  </Section>;
}
