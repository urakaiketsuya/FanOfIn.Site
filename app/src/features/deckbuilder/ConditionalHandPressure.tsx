import { useMemo, useState } from "react";
import type { Card } from "@gatcg/shared";
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
  if (summary.conditionalCopies === 0) return null;
  const pressure = summary.chanceTwo >= 0.5 ? "High" : summary.chanceTwo >= 0.25 ? "Moderate" : "Low";
  const tone = pressure === "High" ? "text-ctp-red" : pressure === "Moderate" ? "text-ctp-yellow" : "text-ctp-green";

  return <Panel data-component="ConditionalHandPressure" className="mt-4 shadow-sm"><Section heading="dense" title="Conditional hand pressure" description="How often could multiple cards ask for an external condition at the same time?">
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <div role="group" aria-label="Cards-seen checkpoint" className="inline-flex rounded-md border border-ctp-surface1 bg-ctp-base p-0.5">
        {(["opening", "ten"] as const).map((value) => <button key={value} type="button" aria-pressed={checkpoint === value} onClick={() => setCheckpoint(value)} className={`rounded px-2.5 py-1 text-xs ${checkpoint === value ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"}`}>{value === "opening" ? `Opening ${openingSize}` : "By 10"}</button>)}
      </div>
      <div className="text-right"><div className={`text-lg font-bold tabular-nums ${tone}`}>{pressure}</div><div className="text-[10px] text-ctp-subtext0">pressure rating</div></div>
    </div>
    <div className="mt-3 grid grid-cols-3 gap-2">
      {[["1+ conditional", summary.chanceOne], ["2+ conditional", summary.chanceTwo], ["3+ conditional", summary.chanceThree]].map(([label, odds]) => <div key={label as string} className="rounded-lg border border-ctp-surface1 bg-ctp-base/35 p-2 text-center"><div className="text-sm font-semibold tabular-nums text-ctp-text">{((odds as number) * 100).toFixed(1)}%</div><div className="text-[10px] text-ctp-subtext0">{label as string}</div></div>)}
    </div>
    <details className="mt-3 rounded-lg border border-ctp-surface1 bg-ctp-base/25 px-3 py-2"><summary className="cursor-pointer text-xs font-medium text-ctp-subtext1">{summary.conditionalCopies} copies across {summary.conditionalNames} potentially conditional cards</summary><div className="mt-2 space-y-1.5">{summary.rows.map((row) => <div key={row.name} className="flex flex-wrap items-center justify-between gap-2 text-[11px]"><span className="font-medium text-ctp-text">{row.copies}× {row.name}</span><span className="text-ctp-subtext0">{row.reasons.join(" · ")}</span></div>)}</div></details>
    <details className="mt-2 text-[10px] leading-4 text-ctp-subtext0"><summary className="cursor-pointer">How this is calculated</summary><p className="mt-1">Exact without-replacement draw odds; no mulligan. This conservatively flags printed bonus, Champion, board, graveyard, and opponent requirements. It does not prove a card is dead or evaluate whether its condition is enabled.</p></details>
  </Section></Panel>;
}
