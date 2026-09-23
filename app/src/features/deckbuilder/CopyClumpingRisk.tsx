import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Card } from "@gatcg/shared";
import CardImage from "../../components/CardImage";
import Panel from "../../components/ui/Panel";
import Section from "../../components/ui/Section";
import { inferStartingHandSize } from "../../lib/turnToPlay";
import { probabilityAtLeast } from "./synergyReadiness";

interface ClumpingRow { name: string; copies: number; openingTwo: number; earlyTwo: number; earlyThree: number }
interface ClumpingGroup { copies: number; rows: ClumpingRow[]; openingTwo: number; earlyTwo: number; earlyThree: number }

export default function CopyClumpingRisk({ mainLines, materialLines, catalogByName }: {
  mainLines: { name: string; quantity: number }[];
  materialLines: { name: string; quantity: number }[];
  catalogByName: Map<string, Card>;
}) {
  const [copied, setCopied] = useState(false);
  const deckSize = mainLines.reduce((sum, line) => sum + line.quantity, 0);
  const startingHandSize = useMemo(() => inferStartingHandSize(materialLines, catalogByName), [materialLines, catalogByName]);
  const rows = useMemo<ClumpingRow[]>(() => mainLines.filter((line) => line.quantity >= 2).map((line) => ({
    name: line.name,
    copies: line.quantity,
    openingTwo: probabilityAtLeast(deckSize, line.quantity, startingHandSize, 2),
    earlyTwo: probabilityAtLeast(deckSize, line.quantity, Math.min(10, deckSize), 2),
    earlyThree: probabilityAtLeast(deckSize, line.quantity, Math.min(10, deckSize), 3),
  })).sort((a, b) => b.copies - a.copies || a.name.localeCompare(b.name)), [mainLines, deckSize, startingHandSize]);
  const groups = useMemo<ClumpingGroup[]>(() => [...new Set(rows.map((row) => row.copies))].map((copies) => {
    const matching = rows.filter((row) => row.copies === copies);
    return { copies, rows: matching, openingTwo: matching[0].openingTwo, earlyTwo: matching[0].earlyTwo, earlyThree: matching[0].earlyThree };
  }), [rows]);
  const copyExactValues = async () => {
    const csv = ["card,copies,2+ opening,2+ by 10,3+ by 10", ...rows.map((row) => [JSON.stringify(row.name), row.copies, row.openingTwo.toFixed(6), row.earlyTwo.toFixed(6), row.earlyThree.toFixed(6)].join(","))].join("\n");
    await navigator.clipboard.writeText(csv);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  if (rows.length === 0) return null;
  return <Panel data-component="CopyClumpingRisk" className="mt-4 shadow-sm"><Section heading="dense" title="Copy clumping" description="Duplicate-draw odds grouped by copy count, because every card at the same count has the same probability."><div className="mt-3 space-y-3">{groups.map((group) => <article key={group.copies} className="rounded-xl border border-ctp-surface1 bg-ctp-base/35 p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-ctp-text">{group.copies}-copy cards</p><p className="mt-0.5 text-[10px] text-ctp-subtext0">{group.rows.length} card name{group.rows.length === 1 ? "" : "s"} share these odds</p></div><div className="grid grid-cols-3 gap-3 text-right"><Chance label="2+ opening" value={group.openingTwo} /><Chance label="2+ by 10" value={group.earlyTwo} emphasis /><Chance label="3+ by 10" value={group.earlyThree} /></div></div><div className="mt-3 flex snap-x gap-2 overflow-x-auto pb-1">{group.rows.map((row) => { const card = catalogByName.get(row.name); const tile = <div className="w-20 shrink-0 snap-start"><div className="relative aspect-[5/7] overflow-hidden rounded-lg bg-ctp-surface0">{card?.editions[0] ? <CardImage image={card.editions[0].image} alt={row.name} className="h-full w-full object-cover" /> : <span className="flex h-full items-center p-2 text-center text-[9px] text-ctp-subtext0">{row.name}</span>}<span className="absolute right-1 top-1 rounded-full bg-ctp-base/90 px-1.5 py-0.5 text-[10px] font-semibold text-ctp-text">{row.copies}×</span></div><p className="mt-1 truncate text-[10px] text-ctp-subtext1">{row.name}</p></div>; return card ? <Link key={row.name} to={`/cards/${card.slug}`}>{tile}</Link> : <div key={row.name}>{tile}</div>; })}</div></article>)}</div><details className="mt-3 rounded-lg border border-ctp-surface1 p-2"><summary className="flex min-h-11 cursor-pointer items-center text-xs font-medium text-ctp-blue">Exact values for every card</summary><div className="mt-2 overflow-x-auto"><table className="w-full min-w-[34rem] text-left text-xs"><caption className="sr-only">Exact copy clumping probabilities by card</caption><thead className="text-ctp-subtext0"><tr><th scope="col" className="p-2">Card</th><th scope="col" className="p-2">Copies</th><th scope="col" className="p-2">2+ opening</th><th scope="col" className="p-2">2+ by 10</th><th scope="col" className="p-2">3+ by 10</th></tr></thead><tbody>{rows.map((row) => <tr key={row.name} className="border-t border-ctp-surface1"><th scope="row" className="p-2 font-medium text-ctp-text">{row.name}</th><td className="p-2">{row.copies}</td><td className="p-2 tabular-nums">{(row.openingTwo * 100).toFixed(2)}%</td><td className="p-2 tabular-nums">{(row.earlyTwo * 100).toFixed(2)}%</td><td className="p-2 tabular-nums">{(row.earlyThree * 100).toFixed(2)}%</td></tr>)}</tbody></table></div><button type="button" onClick={copyExactValues} className="mt-2 min-h-11 rounded-lg border border-ctp-blue/50 px-3 text-xs font-semibold text-ctp-blue" aria-live="polite">{copied ? "Copied CSV" : "Copy exact values"}</button></details><details className="mt-3 text-[10px] leading-4 text-ctp-subtext0"><summary className="flex min-h-11 cursor-pointer items-center">How this is calculated</summary><p className="mt-1">Exact without-replacement odds. A card's name and function do not affect clumping probability; only deck size, cards seen, and registered copies do. Multiple copies are not automatically bad.</p></details></Section></Panel>;
}

function Chance({ label, value, emphasis = false }: { label: string; value: number; emphasis?: boolean }) { return <div className="min-w-16"><p className="text-[9px] uppercase tracking-wide text-ctp-subtext0">{label}</p><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ctp-surface0"><span className={`block h-full ${emphasis ? "bg-ctp-yellow" : "bg-ctp-blue"}`} style={{ width: `${value * 100}%` }} /></div><p className={`mt-1 text-sm font-semibold tabular-nums ${emphasis ? "text-ctp-yellow" : "text-ctp-text"}`}>{(value * 100).toFixed(1)}%</p></div>; }
