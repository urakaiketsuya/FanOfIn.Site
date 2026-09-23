import type { Card, CardStat } from "@gatcg/shared";
import { Link } from "react-router-dom";
import CardHoverPreview from "../../components/CardHoverPreview";
import CostIcon from "../../components/CostIcon";
import { InlineState } from "../../components/ui/ContentState";
import Panel from "../../components/ui/Panel";
import Section from "../../components/ui/Section";
import { earliestReleaseDate, statDiff, type SimilarEffectCards } from "../../lib/cardSimilarity";
import CardRelatedRow from "./CardRelatedRow";

const MIN_SAMPLE_SIZE = 5;
const delta = (value: number | null) => value === null || value === 0 ? "" : ` (${value > 0 ? "+" : ""}${value})`;

function SimilarList({ card, cards }: { card: Card; cards: Card[] }) {
  const sorted = [...cards].sort((a, b) => (earliestReleaseDate(a) ?? "").localeCompare(earliestReleaseDate(b) ?? ""));
  return <ul className="mt-3 grid gap-2 sm:grid-cols-2">{sorted.map((candidate) => { const released = earliestReleaseDate(candidate); const diff = statDiff(card, candidate); return <CardRelatedRow key={candidate.uuid} card={candidate} summary={candidate.cost.type !== "none" && candidate.cost.value !== null ? <span className="inline-flex items-center gap-1">Cost <CostIcon kind={candidate.cost.type} size={12} />{candidate.cost.value}{delta(diff.cost)}</span> : "No cost"} detail={<span>Power {candidate.power ?? "—"}{delta(diff.power)} · Life {candidate.life ?? "—"}{delta(diff.life)} · Durability {candidate.durability ?? "—"}{delta(diff.durability)}{released && ` · Released ${new Date(released).toLocaleDateString()}`}</span>} />; })}</ul>;
}

export default function CardSimilarEffectsPanel({ card, cardStat, similarCards, resolveReference }: { card: Card; cardStat?: CardStat; similarCards: SimilarEffectCards; resolveReference: (reference: { slug: string; name: string }) => Card | undefined }) {
  const references = card.references ?? [];
  const referencedBy = card.referenced_by ?? [];
  const showReferences = (!cardStat || cardStat.deckCount < MIN_SAMPLE_SIZE) && (references.length > 0 || referencedBy.length > 0);
  const hasMatches = similarCards.exact.length > 0 || similarCards.core.length > 0;
  return <Section className="mt-4" heading="compact" title="Same effect shape">
    {showReferences && <Panel padding="sm" className="mt-2"><p className="text-xs text-ctp-subtext0">Too few recorded decks for a trustworthy win rate yet (<Link to="/methodology#small-samples" className="text-ctp-blue hover:underline">learn more</Link>). This card's explicit references are a more reliable signal:</p><div className="mt-2 space-y-2">{[{ title: "References", refs: references, showKind: true }, { title: "Referenced by", refs: referencedBy, showKind: false }].filter((group) => group.refs.length > 0).map((group) => <div key={group.title}><h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">{group.title}</h3><div className="mt-1 flex flex-wrap gap-2 text-sm">{group.refs.map((reference) => <CardHoverPreview key={reference.slug} image={resolveReference(reference)?.editions[0]?.image} alt={reference.name}><Link to={`/cards/${reference.slug}`} className="text-ctp-blue hover:underline">{reference.name}{group.showKind && <span className="text-ctp-subtext0"> ({reference.kind.toLowerCase()})</span>}</Link></CardHoverPreview>)}</div></div>)}</div></Panel>}
    {hasMatches ? <><p className="mt-3 text-xs text-ctp-subtext0">Numbers, number words, capitalization, and whitespace are normalized. Changes in parentheses are relative to {card.name}.</p>{similarCards.exact.length > 0 && <div className="mt-4"><h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Exact template ({similarCards.exact.length})</h3><SimilarList card={card} cards={similarCards.exact} /></div>}{similarCards.core.length > 0 && <div className="mt-5"><h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Same core effect ({similarCards.core.length})</h3><p className="mt-1 text-xs text-ctp-subtext0">The base effect matches, while type details or conditional bonus text differ.</p><SimilarList card={card} cards={similarCards.core} /></div>}</> : <InlineState className="mt-4 text-sm">No other cards share {card.name}'s full or core ability template yet.</InlineState>}
  </Section>;
}
