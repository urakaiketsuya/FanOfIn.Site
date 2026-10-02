import { useMemo, useState } from "react";
import type { Card } from "@gatcg/shared";
import { Link } from "react-router-dom";
import CardArtTile from "../../components/CardArtTile";
import DisclosureChevron from "../../components/DisclosureChevron";
import Button from "../../components/ui/Button";
import Panel from "../../components/ui/Panel";
import Section from "../../components/ui/Section";
import { inferStartingHandSize } from "../../lib/turnToPlay";
import { calculateConditionalPressure } from "./conditionalPressureCalculation";

export default function ConditionalHandPressure({ mainLines, materialLines, catalogByName }: {
  mainLines: { name: string; quantity: number }[];
  materialLines: { name: string; quantity: number }[];
  catalogByName: Map<string, Card>;
}) {
  const openingSize = useMemo(() => inferStartingHandSize(materialLines, catalogByName), [materialLines, catalogByName]);
  const [checkpoint, setCheckpoint] = useState<"opening" | "ten">("opening");
  const summary = useMemo(
    () => calculateConditionalPressure(mainLines, catalogByName, checkpoint === "opening" ? openingSize : 10),
    [mainLines, catalogByName, checkpoint, openingSize],
  );
  const [limit, setLimit] = useState(6);
  const unresolved = mainLines.filter((line) => !catalogByName.has(line.name));

  return <Panel data-component="ConditionalHandPressure" className="mt-4 shadow-sm"><Section heading="dense" title="Cards with printed conditions" description="How often could multiple cards ask for an external condition at the same time?">
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <div role="group" aria-label="Cards-seen checkpoint" className="inline-flex rounded-md border border-ctp-surface1 bg-ctp-base p-0.5">
        {(["opening", "ten"] as const).map((value) => <Button key={value} variant={checkpoint === value ? "primary" : "ghost"} type="button" aria-pressed={checkpoint === value} onClick={() => setCheckpoint(value)} className="rounded px-2.5 py-1 text-xs">{value === "opening" ? `Opening ${openingSize}` : "By 10"}</Button>)}
      </div>

    </div>
    <p className="mt-3 text-sm text-ctp-subtext1">A printed condition does not make a card unwanted. These odds measure access, without checking whether conditions are enabled.</p>
    {unresolved.length > 0 && <p className="mt-3 rounded-lg border border-ctp-yellow/40 p-3 text-sm">Conditions could not be checked for: {unresolved.map((line) => line.name).join(", ")}. Those cards are excluded from the detected pool.</p>}
    {summary.rows.length === 0 && <p className="mt-3 rounded-xl bg-ctp-surface0 p-4 text-sm">No supported condition markers were detected. This does not establish that every card is unconditional.</p>}
    <div className="identity-surface mt-3 grid grid-cols-1 gap-3 rounded-2xl border border-ctp-blue/30 p-4 sm:grid-cols-3">
      {[["1+ conditional", summary.chanceOne], ["2+ conditional", summary.chanceTwo], ["3+ conditional", summary.chanceThree]].map(([label, odds]) => <div key={label as string} className="rounded-lg border border-ctp-surface1 bg-ctp-base/35 p-2 text-center"><div className="text-3xl font-semibold tabular-nums text-ctp-text">{((odds as number) * 100).toFixed(1)}%</div><div className="text-[10px] text-ctp-subtext0">{label as string}</div></div>)}
    </div>
    <p className="mt-4 text-sm font-semibold">{summary.conditionalCopies} copies across {summary.conditionalNames} detected cards</p>
    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{summary.rows.slice(0, limit).map((row) => { const card = catalogByName.get(row.name); return <article key={row.name} className="min-w-0 rounded-xl border border-ctp-surface1 p-3">{card ? <Link to={`/cards/${card.slug}`} target="_blank" rel="noreferrer" className="block rounded focus-visible:outline-2 focus-visible:outline-ctp-blue"><CardArtTile card={card} name={row.name} cornerBadge={`${row.copies}×`} /><span className="mt-2 block break-words text-sm font-medium">{row.name}</span><span className="sr-only">Opens details in a new tab</span></Link> : <><CardArtTile card={card} name={row.name} /><p>{row.name}</p></>}<p className="mt-2 text-xs text-ctp-subtext1">{row.reasons.join(" · ")}</p></article>; })}</div>
    {summary.rows.length > limit && <Button className="mt-3" onClick={() => setLimit(limit + 6)}>Show more cards</Button>}
    <details className="mt-2 text-[10px] leading-4 text-ctp-subtext0"><summary className="flex min-h-12 cursor-pointer items-center gap-2"><DisclosureChevron />How this is calculated</summary><p className="mt-1">Exact without-replacement draw odds; no mulligan. This conservatively flags printed bonus, Champion, board, graveyard, and opponent requirements. It does not prove a card is dead or evaluate whether its condition is enabled.</p></details>
  </Section></Panel>;
}
