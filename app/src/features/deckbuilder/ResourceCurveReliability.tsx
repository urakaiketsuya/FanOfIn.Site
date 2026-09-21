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

function Timing({ label, turn, seen, probability }: { label: string; turn: number; seen: number; probability: number }) {
  const read = status(probability);
  return <div><div className="font-semibold tabular-nums text-ctp-teal">{(probability * 100).toFixed(1)}%</div><div className="text-[10px] text-ctp-subtext0">{label} · T{turn} · {seen} seen</div><div className={`text-[10px] font-medium ${read.className}`}>{read.label}</div></div>;
}

export default function ResourceCurveReliability({ mainLines, materialLines, catalogByName }: {
  mainLines: { name: string; quantity: number }[];
  materialLines: { name: string; quantity: number }[];
  catalogByName: Map<string, Card>;
}) {
  const startingHandSize = useMemo(() => inferStartingHandSize(materialLines, catalogByName), [materialLines, catalogByName]);
  const points = useMemo(() => computeResourceCurveReliability(mainLines, catalogByName, startingHandSize), [mainLines, catalogByName, startingHandSize]);
  if (points.length === 0) return null;
  return <Panel data-component="ResourceCurveReliability" className="mt-4 shadow-sm"><Section heading="dense" title="Resource curve reliability" description="Chance of finding each Reserve cost by its first affordable turn."><div className="mt-3 space-y-2 sm:hidden">{points.map((point) => { const read = status(point.first.probability); return <div key={point.cost} className="rounded-lg border border-ctp-surface1 bg-ctp-base/35 p-3"><div className="flex items-center justify-between"><span className="font-semibold text-ctp-text">Reserve {point.cost}</span><span className={`text-lg font-bold tabular-nums ${read.className}`}>{(point.first.probability * 100).toFixed(1)}%</span></div><div className="mt-1 flex justify-between text-[10px] text-ctp-subtext0"><span>{point.copies} copies · T{point.first.turn} going first</span><span>{(point.second.probability * 100).toFixed(1)}% second</span></div></div>; })}</div><div className="mt-3 hidden overflow-x-auto sm:block"><table className="w-full min-w-[32rem] text-left text-xs"><thead className="text-[10px] uppercase tracking-wide text-ctp-subtext0"><tr><th className="pb-2">Reserve</th><th className="pb-2">Copies</th><th className="pb-2">Going first</th><th className="pb-2">Going second</th><th className="pb-2">Delta</th></tr></thead><tbody>{points.map((point) => { const delta = point.second.probability - point.first.probability; return <tr key={point.cost} className="border-t border-ctp-surface1 align-top"><td className="py-2 font-semibold text-ctp-text">{point.cost}</td><td className="py-2 tabular-nums text-ctp-subtext1">{point.copies}</td><td className="py-2"><Timing label="First" {...point.first} /></td><td className="py-2"><Timing label="Second" {...point.second} /></td><td className={`py-2 font-semibold tabular-nums ${delta > 0 ? "text-ctp-green" : "text-ctp-subtext0"}`}>{delta > 0 ? "+" : ""}{(delta * 100).toFixed(1)} pts{point.second.turn < point.first.turn && <div className="text-[10px] font-normal text-ctp-green">1 turn sooner</div>}</td></tr>; })}</tbody></table></div><details className="mt-2 text-[10px] leading-4 text-ctp-subtext0"><summary className="cursor-pointer">How this is calculated</summary><p className="mt-1">Exact draw odds use the selected level-0 Champion's starting hand. The second player sees one additional card at the same personal turn. Availability does not account for board state, level requirements, or earlier spending.</p></details></Section></Panel>;
}
