import type { Card, CardStat } from "@gatcg/shared";
import { useState } from "react";
import { Link } from "react-router-dom";
import CardHoverPreview from "../../components/CardHoverPreview";
import CostIcon from "../../components/CostIcon";
import { InlineState } from "../../components/ui/ContentState";
import Panel from "../../components/ui/Panel";
import Section from "../../components/ui/Section";
import { earliestReleaseDate, statDiff, type SimilarConceptCard, type SimilarEffectCards } from "../../lib/cardSimilarity";
import CardRelatedRow from "./CardRelatedRow";

const MIN_SAMPLE_SIZE = 5;
const delta = (value: number | null) => value === null || value === 0 ? "" : ` (${value > 0 ? "+" : ""}${value})`;

function SimilarList({ card, cards }: { card: Card; cards: Card[] }) {
  const sorted = [...cards].sort((a, b) => (earliestReleaseDate(a) ?? "").localeCompare(earliestReleaseDate(b) ?? ""));
  return <ul className="mt-3 grid gap-2 sm:grid-cols-2">{sorted.map((candidate) => { const released = earliestReleaseDate(candidate); const diff = statDiff(card, candidate); return <CardRelatedRow key={candidate.uuid} card={candidate} summary={candidate.cost.type !== "none" && candidate.cost.value !== null ? <span className="inline-flex items-center gap-1">Cost <CostIcon kind={candidate.cost.type} size={12} />{candidate.cost.value}{delta(diff.cost)}</span> : "No cost"} detail={<span>Power {candidate.power ?? "—"}{delta(diff.power)} · Life {candidate.life ?? "—"}{delta(diff.life)} · Durability {candidate.durability ?? "—"}{delta(diff.durability)}{released && ` · Released ${new Date(released).toLocaleDateString()}`}</span>} />; })}</ul>;
}

function ConceptList({ card, matches }: { card: Card; matches: SimilarConceptCard[] }) {
  const [showAll, setShowAll] = useState(false);
  const rows = (items: SimilarConceptCard[]) => items.map((match) => { const diff = statDiff(card, match.card); return <CardRelatedRow key={match.card.uuid} card={match.card} summary={<span className="flex flex-wrap gap-1">{match.sharedConcepts.map((concept) => <span key={concept.id} className="rounded-full bg-ctp-surface0 px-2 py-0.5 text-ctp-subtext1">{concept.label}</span>)}</span>} detail={<span>Power {match.card.power ?? "—"}{delta(diff.power)} · Life {match.card.life ?? "—"}{delta(diff.life)} · Durability {match.card.durability ?? "—"}{delta(diff.durability)}</span>} />; });
  const visible = showAll ? matches : matches.slice(0, 12);
  const remaining = matches.length - visible.length;
  return <><ul className="mt-3 grid gap-2 sm:grid-cols-2">{rows(visible)}</ul>{remaining > 0 && <button type="button" onClick={() => setShowAll(true)} className="mt-3 min-h-11 w-full rounded-lg border border-ctp-surface1 px-3 text-sm font-medium text-ctp-blue sm:w-auto">Show {remaining} more concept match{remaining === 1 ? "" : "es"}</button>}</>;
}

type SimilarityLayer = "text" | "mechanic" | "concept";

export default function CardSimilarEffectsPanel({ card, cardStat, similarCards, resolveReference }: { card: Card; cardStat?: CardStat; similarCards: SimilarEffectCards; resolveReference: (reference: { slug: string; name: string }) => Card | undefined }) {
  const firstLayer: SimilarityLayer = similarCards.exact.length > 0 ? "text" : similarCards.core.length > 0 ? "mechanic" : "concept";
  const [layer, setLayer] = useState<SimilarityLayer>(firstLayer);
  const references = card.references ?? [];
  const referencedBy = card.referenced_by ?? [];
  const showReferences = (!cardStat || cardStat.deckCount < MIN_SAMPLE_SIZE) && (references.length > 0 || referencedBy.length > 0);
  const hasMatches = similarCards.exact.length > 0 || similarCards.core.length > 0 || similarCards.concept.length > 0;
  const layers: { id: SimilarityLayer; label: string; count: number }[] = [
    { id: "text", label: "Text", count: similarCards.exact.length },
    { id: "mechanic", label: "Mechanic", count: similarCards.core.length },
    { id: "concept", label: "Concept", count: similarCards.concept.length },
  ];
  const activeLayer = layers.some((item) => item.id === layer && item.count > 0) ? layer : firstLayer;
  return <Section className="mt-4" heading="compact" title="Similar effects">
    {showReferences && <Panel padding="sm" className="mt-2"><p className="text-xs text-ctp-subtext0">Too few recorded decks for a trustworthy win rate yet (<Link to="/methodology#small-samples" className="text-ctp-blue hover:underline">learn more</Link>). This card's explicit references are a more reliable signal:</p><div className="mt-2 space-y-2">{[{ title: "References", refs: references, showKind: true }, { title: "Referenced by", refs: referencedBy, showKind: false }].filter((group) => group.refs.length > 0).map((group) => <div key={group.title}><h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">{group.title}</h3><div className="mt-1 flex flex-wrap gap-2 text-sm">{group.refs.map((reference) => <CardHoverPreview key={reference.slug} image={resolveReference(reference)?.editions[0]?.image} alt={reference.name}><Link to={`/cards/${reference.slug}`} className="text-ctp-blue hover:underline">{reference.name}{group.showKind && <span className="text-ctp-subtext0"> ({reference.kind.toLowerCase()})</span>}</Link></CardHoverPreview>)}</div></div>)}</div></Panel>}
    {hasMatches ? <><p className="mt-3 text-xs leading-5 text-ctp-subtext0">Choose how broad the comparison should be. These are text relationships, not upgrade recommendations; stat changes are relative to {card.name}.</p><div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="Similarity layer">{layers.map((item) => <button key={item.id} type="button" disabled={item.count === 0} aria-pressed={activeLayer === item.id} onClick={() => setLayer(item.id)} className={`min-h-11 rounded-lg border px-2 py-1 text-xs font-semibold ${activeLayer === item.id ? "border-ctp-blue bg-ctp-blue/10 text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1"} disabled:cursor-not-allowed disabled:opacity-40`}><span className="block">{item.label}</span><span className="font-normal tabular-nums">{item.count}</span></button>)}</div>{activeLayer === "text" && <div className="mt-4"><h3 className="text-sm font-semibold text-ctp-text">Matching text template</h3><p className="mt-1 text-xs leading-5 text-ctp-subtext0">Same card types, subtypes, and full effect after numbers and formatting are normalized.</p><SimilarList card={card} cards={similarCards.exact} /></div>}{activeLayer === "mechanic" && <div className="mt-4"><h3 className="text-sm font-semibold text-ctp-text">Matching core mechanic</h3><p className="mt-1 text-xs leading-5 text-ctp-subtext0">The base effect text matches, but card types or conditional bonus clauses may differ.</p><SimilarList card={card} cards={similarCards.core} /></div>}{activeLayer === "concept" && <div className="mt-4"><h3 className="text-sm font-semibold text-ctp-text">Shared concepts</h3><p className="mt-1 text-xs leading-5 text-ctp-subtext0">Broader discovery based only on explicit effect language such as drawing, banishing, tokens, or cost reduction. Read each card before treating it as interchangeable.</p><ConceptList card={card} matches={similarCards.concept} /></div>}</> : <InlineState className="mt-4 text-sm">No text, mechanic, or supported concept matches were found for {card.name}.</InlineState>}
  </Section>;
}
