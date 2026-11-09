import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { ChampionPackageCard, ChampionPackagesData } from "@gatcg/shared";
import CardResult from "../../components/CardResult";
import PublishedSourceStatus from "../../components/PublishedSourceStatus";
import Button from "../../components/ui/Button";
import Section from "../../components/ui/Section";
import { InlineState } from "../../components/ui/ContentState";
import { usePublishedData, usePublishedDataStatus } from "../../lib/sync/usePublishedData";
import { useCardsByNames } from "../events/useCardsByNames";
import { addPackageToNewDeckDraft } from "../account/packageDraft";
import { sharedPackageFromLines } from "@gatcg/shared";
import { packageShareUrl } from "../../lib/packageShareUrl";
import { useToast } from "../../components/ui/toast/ToastContext";

const pct = (value: number | null) => value === null ? "—" : `${Math.round(value * 100)}%`;
/** Tonal fill, lift and a check mark mark a selected option; color is never the only cue. */
const optionClass = "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] aria-pressed:border-ctp-blue aria-pressed:bg-ctp-blue/15 aria-pressed:text-ctp-blue aria-pressed:shadow-md aria-pressed:font-semibold";

/** Cards one champion build plays together, with recent and all-time evidence kept apart.
 * Nothing reaches a deck until the Add button is pressed. */
export default function ChampionPackage({ championName }: { championName: string }) {
  const [params] = useSearchParams();
  return <ChampionPackageSelection key={JSON.stringify([championName, params.get("build") ?? ""])} championName={championName} />;
}

function ChampionPackageSelection({ championName }: { championName: string }) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const data = usePublishedData<ChampionPackagesData>("analysis-champion-packages", "/data/analysis/champion-packages.json");
  const status = usePublishedDataStatus("analysis-champion-packages", "/data/analysis/champion-packages.json");
  const requested = params.get("build") ?? "";
  const mine = useMemo(() => data?.packages.filter(item => item.champion === championName) ?? [], [data, championName]);
  const choices = mine.filter(item => item.championCard === (requested || null));
  const element = params.get("packageElement") ?? "";
  const pack = choices.find(item => (item.element ?? "") === element);
  function selectPool(value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set("packageElement", value); else next.delete("packageElement");
    setParams(next, { preventScrollReset: true });
  }
  const [selections, setSelections] = useState<Record<string, { variant: number; picked: Record<string, boolean> }>>({});
  const selection = selections[element] ?? { variant: 0, picked: {} };
  const variantIndex = selection.variant;
  const picked = selection.picked;
  const setVariantIndex = (variant: number) => setSelections(values => ({ ...values, [element]: { ...selection, variant } }));
  const toggleOption = (id: string) => setSelections(values => ({ ...values, [element]: { ...selection, picked: { ...picked, [id]: !picked[id] } } }));
  const [error, setError] = useState("");
  const { notify } = useToast();
  const names = useMemo(() => pack ? [...pack.core, ...pack.options].map(card => card.name) : [], [pack]);
  const art = useCardsByNames(names);
  if (data && !pack) return mine.length || requested ? <Section id="package" className="scroll-mt-48" heading="compact" title="Package"><InlineState className="text-sm">{requested ? "No package is available for this selection." : "No package is available for this champion yet."}</InlineState>{element && <Button onClick={() => selectPool("")}>Show full build package</Button>}</Section> : null;
  const variant = pack?.variants[Math.min(variantIndex, (pack?.variants.length ?? 1) - 1)];
  const packageName = pack ? `${pack.championCard ?? pack.champion}${pack.element ? ` ${pack.element}` : ""} package` : "";
  const key = (card: ChampionPackageCard) => `${card.section}:${card.name}`;
  function chosenLines() {
    if (!pack || !variant) return [];
    return [
      ...pack.core.map((card, index) => ({ name: card.name, section: card.section, quantity: variant.copies[index] })),
      ...pack.options.filter(card => picked[key(card)]).map(card => ({ name: card.name, section: card.section, quantity: card.usualCopies })),
    ];
  }
  async function copyLink() {
    if (!pack) return;
    const url = packageShareUrl(sharedPackageFromLines(packageName, pack.champion, chosenLines()));
    try { await navigator.clipboard.writeText(url); notify({ message: "Package link copied.", key: "package-link" }); }
    catch { notify({ tone: "error", message: "Could not copy the package link. Please try again.", key: "package-link" }); }
  }
  function add() {
    if (!pack || !variant) return;
    const lines = chosenLines();
    if (!addPackageToNewDeckDraft(lines, packageName)) { setError("Could not save the draft on this device. Check that site storage is allowed."); return; }
    navigate("/decks/new");
  }
  const tile = (card: ChampionPackageCard, copies: number, extra?: { selected: boolean; toggle: () => void }) => {
    const resolved = art.get(card.name);
    return <CardResult key={key(card)} card={resolved} name={card.name} selected={extra?.selected} onSelect={extra?.toggle}>
      <span className="mt-2 block text-sm text-ctp-text">{copies} copies · {card.section === "main" ? "Main" : "Material"}</span>
      <span className="mt-1 block text-xs text-ctp-subtext1">Recent {pct(card.recentInclusion)} · All-time {pct(card.allInclusion)}</span>
      {extra && resolved && <Link to={`/cards/${resolved.slug}`} className="mt-2 flex min-h-12 items-center rounded px-2 text-sm text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue" aria-label={`Details for ${card.name}`}>Card details</Link>}
    </CardResult>;
  };
  return <Section id="package" className="scroll-mt-48" heading="compact" title="Package">
    <PublishedSourceStatus label="Champion packages" status={status} hasData={!!data} />
    {pack && variant && <>
      {choices.length > 1 && <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Package card pool">
        {choices.map(item => <Button key={item.element ?? "full"} aria-pressed={item === pack} className={optionClass} onClick={() => selectPool(item.element ?? "")}>{item.element ? `${item.element} package` : "Full build package"}</Button>)}
      </div>}
      <p className="mt-3 text-sm text-ctp-subtext1">{pack.championCard ?? `All ${pack.champion} builds`} · {pack.element ?? "All elements"} · {pack.core.length + pack.options.length} cards in pool</p>
      <h3 className="mt-4 text-sm font-semibold text-ctp-text">Required core · {pack.core.length} cards</h3>
      <p className="text-xs text-ctp-subtext0">{pack.completeDecks.toLocaleString()} of {pack.decks.toLocaleString()} decks hold every core card ({pack.completeRecentDecks.toLocaleString()} of {pack.recentDecks.toLocaleString()} recent). Champion cards are not included.</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{pack.core.map((card, index) => tile(card, variant.copies[index]))}</div>
      <h3 className="mt-5 text-sm font-semibold text-ctp-text">Observed variants</h3>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Exact copy pattern">
        {pack.variants.map((item, index) => <Button key={item.copies.join()} size="sm" className={optionClass} aria-pressed={variant === item} onClick={() => setVariantIndex(index)}>{variant === item && "✓ "}Pattern {index + 1} · {item.decks.toLocaleString()} decks ({item.recentDecks.toLocaleString()} recent)</Button>)}
      </div>
      {pack.options.length > 0 && <>
        <h3 className="mt-5 text-sm font-semibold text-ctp-text">Optional cards</h3>
        <p className="text-xs text-ctp-subtext0">Common cards outside the core. Select the ones to add; they use their usual copies.</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{pack.options.map(card => tile(card, card.usualCopies, { selected: !!picked[key(card)], toggle: () => toggleOption(key(card)) }))}</div>
      </>}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={add}>Add to new deck</Button>
        <Button onClick={() => void copyLink()}>Copy package link</Button>
        <span className="text-xs text-ctp-subtext0">Opens the deck editor with these cards. A deck you are already drafting keeps its cards.</span>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-ctp-red">{error}</p>}
    </>}
  </Section>;
}
