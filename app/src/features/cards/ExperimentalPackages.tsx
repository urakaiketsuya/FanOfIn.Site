import { useEffect, useState } from "react";
import type { Card } from "@gatcg/shared";
import PackageCardGrid from "./PackageCardGrid";
import DisclosureChevron from "../../components/DisclosureChevron";
import type report from "../../../../docs/experiments/package-mechanics.json";

type Report = typeof report;
const control = "min-h-12 rounded-lg border border-ctp-surface1 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ctp-teal";
const labels: Record<string, string> = { "cardistry-trigger": "Cardistry trigger", "memory-to-field": "Memory to field", "suited-damage": "Suited damage", "graveyard-enable-payoff": "Graveyard removal + payoff" };

export default function ExperimentalPackages({ query, cardsByName }: { query: string; cardsByName: ReadonlyMap<string, Card> }) {
  const [data, setData] = useState<Report>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [limit, setLimit] = useState(12);
  useEffect(() => { setLimit(12); }, [query]);
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    fetch("/data/experiments/package-mechanics.json", { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Unavailable");
      const value = await response.json() as Report;
      if (value.method !== "mechanics-experiment-v1" || !Array.isArray(value.candidates)) throw new Error("Invalid report");
      if (!controller.signal.aborted) setData(value);
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [attempt]);
  if (error) return <div role="alert" className="mt-4">Experimental candidates unavailable. <button className={control} onClick={() => setAttempt(attempt + 1)}>Retry experimental candidates</button></div>;
  if (!data) return <p role="status" className="mt-4">Loading experimental candidates…</p>;
  const filtered = data.candidates.filter(c => [...c.cards, labels[c.interaction] ?? c.interaction, c.reason].some(v => v.toLowerCase().includes(query)));
  return <div className="mt-4 space-y-4">
    <p className="text-sm text-ctp-subtext0">{filtered.length} experimental {filtered.length === 1 ? "candidate" : "candidates"} · Needs review</p>
    {!filtered.length && <p role="status">No experimental candidates match this search.</p>}
    {filtered.slice(0, limit).map(c => <article key={`${c.cards.join("|")}:${c.interaction}`} className="min-w-0 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4">
      <h2 className="text-lg font-semibold">{labels[c.interaction] ?? c.interaction}</h2>
      <PackageCardGrid names={c.cards} cardsByName={cardsByName} />
      <p className="mt-3 text-sm">{c.usage.togetherDecks.toLocaleString()} decks together · {c.usage.events.toLocaleString()} events</p>
      <details className="group mt-3">
        <summary className={`${control} flex cursor-pointer list-none items-center justify-between gap-3`}>Interaction evidence<DisclosureChevron className="group-open:rotate-180" /></summary>
        <div className="mt-3 space-y-3 break-words text-sm">
          <p>{c.reason}</p>
          <ul className="list-disc space-y-2 pl-5">{c.constraints.map(item => <li key={item}>{item}</li>)}</ul>
          <p>{c.cards[0]}: {c.usage.togetherDecks} of {c.usage.anchorDecks} decks also include {c.cards[1]}.</p>
          <p>{c.cards[1]}: {c.usage.togetherDecks} of {c.usage.memberDecks} decks also include {c.cards[0]}.</p>
          <p>Copies ({c.cards.join(" / ")}): {Object.entries(c.usage.quantities).map(([copies, count]) => `${copies.replace("+", " / ")}: ${count} decks`).join("; ") || "No observed decks"}</p>
          <p>Other discovery sources: {c.existingDiscoverySources.join(", ") || "None"}</p>
          <p>Performance: not evaluated by this method.</p>
          {c.evidence.map(e => <div key={e.name}><h3 className="font-semibold">{e.name}</h3><p className="whitespace-pre-line">{e.text}</p></div>)}
          <p className="text-ctp-subtext0">Source: {c.source} · Main + Material · Deck snapshot {data.sources.decks.slice(0, 10)}</p>
        </div>
      </details>
    </article>)}
    {filtered.length > limit && <button className={control} onClick={() => setLimit(limit + 12)}>Show more experimental candidates</button>}
  </div>;
}
