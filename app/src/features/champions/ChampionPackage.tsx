import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { ChampionPackageCard, ChampionPackagesData } from "@gatcg/shared";
import CardArtTile from "../../components/CardArtTile";
import PublishedSourceStatus from "../../components/PublishedSourceStatus";
import Button from "../../components/ui/Button";
import Section from "../../components/ui/Section";
import { InlineState } from "../../components/ui/ContentState";
import { usePublishedData, usePublishedDataStatus } from "../../lib/sync/usePublishedData";
import { useCardsByNames } from "../events/useCardsByNames";
import { addPackageToNewDeckDraft } from "../account/packageDraft";

const pct = (value: number | null) => value === null ? "—" : `${Math.round(value * 100)}%`;
/** Tonal fill, lift and a check mark mark a selected option; color is never the only cue. */
const optionClass = "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] aria-pressed:border-ctp-blue aria-pressed:bg-ctp-blue/15 aria-pressed:text-ctp-blue aria-pressed:shadow-md aria-pressed:font-semibold";
const tileClass = "min-w-0 rounded-xl border bg-ctp-mantle p-3 text-left transition-all duration-200";

/** Cards one champion build plays together, with recent and all-time evidence kept apart.
 * Nothing reaches a deck until the Add button is pressed. */
export default function ChampionPackage({ championName }: { championName: string }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const data = usePublishedData<ChampionPackagesData>("analysis-champion-packages", "/data/analysis/champion-packages.json");
  const status = usePublishedDataStatus("analysis-champion-packages", "/data/analysis/champion-packages.json");
  const requested = params.get("build") ?? "";
  const mine = useMemo(() => data?.packages.filter(item => item.champion === championName) ?? [], [data, championName]);
  const pack = mine.find(item => item.championCard === (requested || null)) ?? (requested ? undefined : mine.find(item => item.championCard === null));
  const [variantIndex, setVariantIndex] = useState(0);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const names = useMemo(() => pack ? [...pack.core, ...pack.options].map(card => card.name) : [], [pack]);
  const art = useCardsByNames(names);
  if (data && !pack) return mine.length || requested ? <Section id="package" className="scroll-mt-48" heading="compact" title="Package"><InlineState className="text-sm">{requested ? "This build has too few decks for a package." : "No package is available for this champion yet."}</InlineState></Section> : null;
  const variant = pack?.variants[Math.min(variantIndex, (pack?.variants.length ?? 1) - 1)];
  const recentBasis = pack?.basis === "recent";
  const key = (card: ChampionPackageCard) => `${card.section}:${card.name}`;
  function add() {
    if (!pack || !variant) return;
    const lines = [
      ...pack.core.map((card, index) => ({ name: card.name, section: card.section, quantity: variant.copies[index] })),
      ...pack.options.filter(card => picked[key(card)]).map(card => ({ name: card.name, section: card.section, quantity: card.usualCopies })),
    ];
    if (!addPackageToNewDeckDraft(lines, `${pack.championCard ?? pack.champion} package`)) { setError("Could not save the draft on this device. Check that site storage is allowed."); return; }
    navigate("/decks/new");
  }
  const tile = (card: ChampionPackageCard, copies: number, extra?: { selected: boolean; toggle: () => void }) => {
    const body = <><div className="w-full"><CardArtTile card={art.get(card.name)} name={card.name} /></div>
      <span className="mt-2 block break-words text-sm font-medium text-ctp-text">{extra?.selected && "✓ "}{copies}× {card.name}</span>
      <span className="mt-1 block text-xs text-ctp-subtext1">{card.section === "main" ? "Main" : "Material"} · Recent {pct(card.recentInclusion)} · All-time {pct(card.allInclusion)}</span></>;
    return extra
      ? <button key={key(card)} type="button" aria-pressed={extra.selected} onClick={extra.toggle} className={`${tileClass} hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] ${extra.selected ? "border-ctp-blue bg-ctp-blue/10 shadow-md" : "border-ctp-surface1"}`}>{body}</button>
      : <div key={key(card)} className={`${tileClass} border-ctp-surface1 hover:-translate-y-0.5 hover:shadow-md`}>{body}</div>;
  };
  return <Section id="package" className="scroll-mt-48" heading="compact" title="Package"
    description="Cards that players of this build bring together. Built from decks that contain the whole core, not from each card alone.">
    <PublishedSourceStatus label="Champion packages" status={status} hasData={!!data} />
    {pack && variant && <>
      <p className="mt-2 text-sm text-ctp-subtext1">{pack.championCard ?? `All ${pack.champion} builds`} · Standard tournament decks. {recentBasis ? `The core is the cards in at least 75% of the ${pack.recentDecks.toLocaleString()} decks from the last 90 days.` : `Too few recent decks, so the core is the cards in at least 75% of all ${pack.decks.toLocaleString()} decks.`} Recent and all-time shares are shown apart.</p>
      <h3 className="mt-4 text-sm font-semibold text-ctp-text">Core · {pack.core.length} cards</h3>
      <p className="text-xs text-ctp-subtext0">{pack.completeDecks.toLocaleString()} of {pack.decks.toLocaleString()} decks hold every core card ({pack.completeRecentDecks.toLocaleString()} of {pack.recentDecks.toLocaleString()} recent). Champion cards are not included.</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{pack.core.map((card, index) => tile(card, variant.copies[index]))}</div>
      <h3 className="mt-5 text-sm font-semibold text-ctp-text">Exact copies</h3>
      <p className="text-xs text-ctp-subtext0">Each pattern is counted only in decks that hold the whole core.</p>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Exact copy pattern">
        {pack.variants.map((item, index) => <Button key={item.copies.join()} size="sm" className={optionClass} aria-pressed={variant === item} onClick={() => setVariantIndex(index)}>{variant === item && "✓ "}Pattern {index + 1} · {item.decks.toLocaleString()} decks ({item.recentDecks.toLocaleString()} recent)</Button>)}
      </div>
      {pack.options.length > 0 && <>
        <h3 className="mt-5 text-sm font-semibold text-ctp-text">Options</h3>
        <p className="text-xs text-ctp-subtext0">Common cards outside the core. Select the ones to add; they use their usual copies.</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{pack.options.map(card => tile(card, card.usualCopies, { selected: !!picked[key(card)], toggle: () => setPicked(value => ({ ...value, [key(card)]: !value[key(card)] })) }))}</div>
      </>}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={add}>Add to new deck</Button>
        <span className="text-xs text-ctp-subtext0">Opens the deck editor with these cards. A deck you are already drafting keeps its cards.</span>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-ctp-red">{error}</p>}
    </>}
  </Section>;
}
