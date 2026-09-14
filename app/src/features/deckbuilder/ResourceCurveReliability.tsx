import { useMemo } from "react";
import type { Card } from "@gatcg/shared";
import Panel from "../../components/ui/Panel";
import Section from "../../components/ui/Section";
import { inferStartingHandSize } from "../../lib/turnToPlay";
import { computeResourceCurveReliability } from "./resourceCurve";

function status(probability: number): { label: string; className: string } {
  if (probability >= 0.8) return { label: "Reliable", className: "text-ctp-green" };
  if (probability >= 0.6) return { label: "Playable", className: "text-ctp-blue" };
  return { label: "Thin", className: "text-ctp-yellow" };
}

export default function ResourceCurveReliability({ mainLines, materialLines, catalogByName }: {
  mainLines: { name: string; quantity: number }[];
  materialLines: { name: string; quantity: number }[];
  catalogByName: Map<string, Card>;
}) {
  const startingHandSize = useMemo(() => inferStartingHandSize(materialLines, catalogByName), [materialLines, catalogByName]);
  const points = useMemo(() => computeResourceCurveReliability(mainLines, catalogByName, startingHandSize), [mainLines, catalogByName, startingHandSize]);
  if (points.length === 0) return null;
  return <Panel data-component="ResourceCurveReliability" className="mt-4 shadow-sm"><Section heading="dense" title="Resource curve reliability" description="Can you find a card at each Reserve cost by the first turn that cost is affordable?"><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[32rem] text-left text-xs"><thead className="text-[10px] uppercase tracking-wide text-ctp-subtext0"><tr><th className="pb-2">Reserve</th><th className="pb-2">Copies</th><th className="pb-2">First affordable</th><th className="pb-2">Chance available</th><th className="pb-2">Read</th></tr></thead><tbody>{points.map((point) => { const read = status(point.probability); return <tr key={point.cost} className="border-t border-ctp-surface1"><td className="py-2 font-semibold text-ctp-text">{point.cost}</td><td className="py-2 tabular-nums text-ctp-subtext1">{point.copies}</td><td className="py-2 text-ctp-subtext1">T{point.turn} · {point.seen} seen</td><td className="py-2 font-semibold tabular-nums text-ctp-teal">{(point.probability * 100).toFixed(1)}%</td><td className={`py-2 font-medium ${read.className}`}>{read.label}</td></tr>; })}</tbody></table></div><p className="mt-2 text-[10px] leading-4 text-ctp-subtext0">Exact draw odds using the selected level-0 champion's starting hand. This tests whether a card at that cost is present—not whether board state, level requirements, or cards spent on earlier plays let you activate it.</p></Section></Panel>;
}
