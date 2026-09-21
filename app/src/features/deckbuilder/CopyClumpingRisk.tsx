import { useMemo } from "react";
import type { Card } from "@gatcg/shared";
import Panel from "../../components/ui/Panel";
import Section from "../../components/ui/Section";
import { inferStartingHandSize } from "../../lib/turnToPlay";
import { probabilityAtLeast } from "./synergyReadiness";

interface ClumpingRow { name: string; copies: number; openingTwo: number; earlyTwo: number; earlyThree: number }

export default function CopyClumpingRisk({ mainLines, materialLines, catalogByName }: {
  mainLines: { name: string; quantity: number }[];
  materialLines: { name: string; quantity: number }[];
  catalogByName: Map<string, Card>;
}) {
  const deckSize = mainLines.reduce((sum, line) => sum + line.quantity, 0);
  const startingHandSize = useMemo(() => inferStartingHandSize(materialLines, catalogByName), [materialLines, catalogByName]);
  const rows = useMemo<ClumpingRow[]>(() => mainLines.filter((line) => line.quantity >= 2).map((line) => ({
    name: line.name,
    copies: line.quantity,
    openingTwo: probabilityAtLeast(deckSize, line.quantity, startingHandSize, 2),
    earlyTwo: probabilityAtLeast(deckSize, line.quantity, Math.min(10, deckSize), 2),
    earlyThree: probabilityAtLeast(deckSize, line.quantity, Math.min(10, deckSize), 3),
  })).sort((a, b) => b.earlyTwo - a.earlyTwo || a.name.localeCompare(b.name)).slice(0, 12), [mainLines, deckSize, startingHandSize]);
  if (rows.length === 0) return null;
  return <Panel data-component="CopyClumpingRisk" className="mt-4 shadow-sm"><Section heading="dense" title="Copy clumping" description="Cards most likely to appear as multiples early."><div className="mt-3 space-y-1.5 sm:hidden">{rows.map((row) => <div key={row.name} className="flex items-center justify-between gap-3 rounded-lg border border-ctp-surface1 bg-ctp-base/35 p-2.5"><div className="min-w-0"><p className="truncate text-xs font-medium text-ctp-text">{row.name}</p><p className="text-[10px] text-ctp-subtext0">{row.copies} copies · {(row.openingTwo * 100).toFixed(1)}% opening</p></div><div className="shrink-0 text-right"><p className="font-semibold tabular-nums text-ctp-yellow">{(row.earlyTwo * 100).toFixed(1)}%</p><p className="text-[10px] text-ctp-subtext0">2+ by 10</p></div></div>)}</div><div className="mt-3 hidden overflow-x-auto sm:block"><table className="w-full min-w-[32rem] text-left text-xs"><thead className="text-[10px] uppercase tracking-wide text-ctp-subtext0"><tr><th className="pb-2">Card</th><th className="pb-2">Copies</th><th className="pb-2">2+ opening</th><th className="pb-2">2+ by 10</th><th className="pb-2">3+ by 10</th></tr></thead><tbody>{rows.map((row) => <tr key={row.name} className="border-t border-ctp-surface1"><td className="max-w-64 truncate py-2 font-medium text-ctp-text">{row.name}</td><td className="py-2 tabular-nums text-ctp-subtext1">{row.copies}</td><td className="py-2 tabular-nums text-ctp-subtext1">{(row.openingTwo * 100).toFixed(1)}%</td><td className="py-2 font-semibold tabular-nums text-ctp-yellow">{(row.earlyTwo * 100).toFixed(1)}%</td><td className="py-2 tabular-nums text-ctp-subtext1">{(row.earlyThree * 100).toFixed(1)}%</td></tr>)}</tbody></table></div><details className="mt-2 text-[10px] leading-4 text-ctp-subtext0"><summary className="cursor-pointer">How this is calculated</summary><p className="mt-1">Exact without-replacement odds, ranked by drawing two or more among the first 10 cards. Multiple copies are not automatically bad.</p></details></Section></Panel>;
}
