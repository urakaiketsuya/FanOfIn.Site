import type { PackageCandidateEvidence } from "@gatcg/shared";
import { Link } from "react-router-dom";
import CardHoverPreview from "../../components/CardHoverPreview";
import CardImage from "../../components/CardImage";
import { InlineState } from "../../components/ui/ContentState";
import Section from "../../components/ui/Section";
import type { IntentMatch } from "../../lib/cardIntent";

interface CardPackage {
  id: string;
  label: string;
  explanation: string;
}

function IntentMatchRow({ match, evidence }: { match: IntentMatch; evidence?: PackageCandidateEvidence }) {
  const archetype = evidence?.archetypeSources?.[0];
  return <li className="group rounded-xl bg-ctp-surface0/70 transition-colors hover:bg-ctp-surface1/70"><Link to={`/cards/${match.card.slug}`} className="flex min-h-20 items-center gap-3 p-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue"><CardHoverPreview image={match.card.editions[0]?.image} alt={match.card.name}><CardImage image={match.card.editions[0]?.image} alt="" className="h-16 w-12 shrink-0 rounded-md object-cover shadow-sm" /></CardHoverPreview><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ctp-text group-hover:text-ctp-blue">{match.card.name}</span><span className="mt-1 flex flex-wrap gap-1.5"><span className="rounded-full bg-ctp-mauve/15 px-2 py-0.5 text-[10px] font-medium capitalize text-ctp-mauve">{match.via}</span>{match.tier === "experimental" && <span className="rounded-full border border-ctp-yellow/60 px-2 py-0.5 text-[10px] text-ctp-yellow">Experimental</span>}{evidence && <span className="rounded-full bg-ctp-green/15 px-2 py-0.5 text-[10px] font-medium text-ctp-green">{evidence.matchingDecks} decks</span>}</span>{archetype && <span className="mt-1 block truncate text-[10px] text-ctp-blue">{archetype.buildName}</span>}</span><span aria-hidden="true" className="text-lg text-ctp-overlay1 transition-transform group-hover:translate-x-0.5 group-hover:text-ctp-blue">›</span></Link></li>;
}

export default function CardIntentPanel({ cardName, packages, feeds, poweredBy, experimentalCount, showExperimental, onShowExperimentalChange, evidenceFor }: { cardName: string; packages: CardPackage[]; feeds: IntentMatch[]; poweredBy: IntentMatch[]; experimentalCount: number; showExperimental: boolean; onShowExperimentalChange: (value: boolean) => void; evidenceFor: (cardName: string) => PackageCandidateEvidence | undefined }) {
  return <Section className="mt-4" heading="compact" title="Intent cards" description={<>Text-detected cards designed to enable or benefit from {cardName}. Relationship chips show why they match; green deck counts add tournament evidence.</>}>
    {packages.length > 0 && <div className="mt-3 rounded-lg border border-ctp-teal/40 bg-ctp-teal/10 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-ctp-teal">Explicit construction package{packages.length === 1 ? "" : "s"}</p><ul className="mt-1.5 space-y-1 text-sm text-ctp-subtext1">{packages.map((deckPackage) => <li key={deckPackage.id}><Link to={`/cards/packages#${deckPackage.id}`} className="font-medium text-ctp-text hover:text-ctp-blue">{deckPackage.label}</Link><span className="text-ctp-subtext0"> — {deckPackage.explanation}</span></li>)}</ul></div>}
    {experimentalCount > 0 && <label className="mt-2 flex items-center gap-1.5 text-xs text-ctp-subtext0"><input type="checkbox" checked={showExperimental} onChange={(event) => onShowExperimentalChange(event.target.checked)} />Show {experimentalCount} experimental match{experimentalCount === 1 ? "" : "es"} (broader reveal, discard, and return-from-discard triggers that may include false positives)</label>}
    {feeds.length === 0 && poweredBy.length === 0 ? <InlineState className="mt-4 text-sm">No text-detected token, tribal, Empower, or named-reference relationship for {cardName} yet.</InlineState> : <div className="mt-4 grid gap-6 lg:grid-cols-2">{[{ title: "Feeds", matches: feeds }, { title: "Powered by", matches: poweredBy }].filter((group) => group.matches.length > 0).map((group) => <div key={group.title}><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">{group.title} ({group.matches.length})</h3><ul className="space-y-2">{group.matches.map((match) => <IntentMatchRow key={`${match.card.uuid}-${match.via}`} match={match} evidence={evidenceFor(match.card.name)} />)}</ul></div>)}</div>}
  </Section>;
}
