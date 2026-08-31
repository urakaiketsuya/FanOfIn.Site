import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { DeckFormat, OmnidexDecklist } from "@gatcg/shared";
import {
  computeAllyPower, computeDamageComposition, computeDeckComposition, computeDeckIdentity,
  computeDeckRating, computeFloatingMemory, computeKeywordComposition, computeMemoryCostCurve,
  computeReserveCostCurve, type RatingPillar,
} from "../../lib/deckIdentity";
import { computeAggressionForecast } from "../../lib/aggressionForecast";
import { buildDeckBuilderPath, deckBuilderParamsFromDecklist } from "../../lib/deckBuilderLink";
import { encodeCustomDecks } from "../../lib/compareShareLink";
import { useCardsByNames } from "../events/useCardsByNames";
import { validateDeck } from "../deckbuilder/validateDeck";
import AggressionForecast from "../decks/AggressionForecast";
import BarChart from "../../components/BarChart";
import DonutChart, { buildChartSegments } from "../../components/DonutChart";
import RankedCompositionChart from "../../components/RankedCompositionChart";

export default function UserDeckStats({ decklist, championName, format, title }: { decklist: OmnidexDecklist; championName: string | null; format: DeckFormat; title: string }) {
  const namedSections = useMemo(() => ({
    main: decklist.main.map((line) => ({ name: line.card, quantity: line.quantity })),
    material: decklist.material.map((line) => ({ name: line.card, quantity: line.quantity })),
    sideboard: decklist.sideboard.map((line) => ({ name: line.card, quantity: line.quantity })),
  }), [decklist]);
  const identityLines = useMemo(() => [...namedSections.main, ...namedSections.material], [namedSections]);
  const cardNames = useMemo(() => [...identityLines, ...namedSections.sideboard].map((line) => line.name), [identityLines, namedSections.sideboard]);
  const cardsByName = useCardsByNames(cardNames);
  const identity = useMemo(() => computeDeckIdentity(identityLines, cardsByName), [identityLines, cardsByName]);
  const rating = useMemo(() => computeDeckRating(identityLines, cardsByName, championName, identity.classes), [identityLines, cardsByName, championName, identity.classes]);
  const aggressionForecast = useMemo(() => computeAggressionForecast(namedSections.main, cardsByName), [namedSections.main, cardsByName]);
  const composition = useMemo(() => computeDeckComposition(identityLines, cardsByName), [identityLines, cardsByName]);
  const memoryCurve = useMemo(() => computeMemoryCostCurve(identityLines, cardsByName), [identityLines, cardsByName]);
  const reserveCurve = useMemo(() => computeReserveCostCurve(identityLines, cardsByName), [identityLines, cardsByName]);
  const keywords = useMemo(() => buildChartSegments(computeKeywordComposition(identityLines, cardsByName)), [identityLines, cardsByName]);
  const allyPower = useMemo(() => computeAllyPower(identityLines, cardsByName), [identityLines, cardsByName]);
  const allyPowerSegments = useMemo(() => buildChartSegments(new Map(Array.from(allyPower.byPower, ([power, count]) => [`Power ${power}`, count]))), [allyPower]);
  const damage = useMemo(() => computeDamageComposition(identityLines, cardsByName), [identityLines, cardsByName]);
  const floatingMemory = useMemo(() => computeFloatingMemory(identityLines, cardsByName, championName, identity.classes), [identityLines, cardsByName, championName, identity.classes]);
  const validation = useMemo(() => validateDeck({
    main: decklist.main.map((line) => ({ cardName: line.card, quantity: line.quantity })),
    material: decklist.material.map((line) => ({ cardName: line.card, quantity: line.quantity })),
    sideboard: decklist.sideboard.map((line) => ({ cardName: line.card, quantity: line.quantity })),
  }, cardsByName, new Set(identity.elements), format), [decklist, cardsByName, identity.elements, format]);
  const builderParams = useMemo(() => deckBuilderParamsFromDecklist(decklist, cardsByName), [decklist, cardsByName]);
  const totals = useMemo(() => ({
    main: decklist.main.reduce((sum, line) => sum + line.quantity, 0),
    material: decklist.material.reduce((sum, line) => sum + line.quantity, 0),
    sideboard: decklist.sideboard.reduce((sum, line) => sum + line.quantity, 0),
  }), [decklist]);

  if (cardNames.length > 0 && cardsByName.size === 0) return <section className="mt-6 rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4 text-sm text-ctp-subtext1">Resolving card data and calculating deck analytics…</section>;

  const validationTone = validation.status === "Legal" ? "border-ctp-green/50 bg-ctp-green/10 text-ctp-green" : validation.status === "Illegal" ? "border-ctp-red/50 bg-ctp-red/10 text-ctp-red" : "border-ctp-yellow/50 bg-ctp-yellow/10 text-ctp-yellow";
  return <div className="mt-6 space-y-6">
    <section className={`rounded-lg border p-4 ${validationTone}`}>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">{validation.status}</h2><p className="mt-1 text-xs opacity-80">Main {totals.main} · Material {totals.material} · Sideboard {totals.sideboard}</p></div><div className="flex flex-wrap gap-2"><Link to={`/compare?custom=${encodeURIComponent(encodeCustomDecks([{ label: title, decklist, format }]))}`} className="rounded-md border border-current px-3 py-1.5 text-sm">Compare deck</Link>{builderParams && <Link to={buildDeckBuilderPath(builderParams.championName, builderParams.spiritFilter, builderParams.lockedCards, builderParams.lockedSections)} className="rounded-md border border-current px-3 py-1.5 text-sm">Edit in Deck Builder</Link>}</div></div>
      {validation.reasons.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{validation.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
      <p className="mt-3 text-[11px] opacity-70">Static construction check only; event-specific rules and card-text exceptions still require an official source.</p>
    </section>

    <section className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4" aria-labelledby="user-deck-score">
      <div className="flex items-center justify-between"><div><h2 id="user-deck-score" className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">DIAO Score</h2><p className="mt-1 text-xs text-ctp-subtext0">Calculated from this exact decklist.</p></div><span className="text-2xl font-bold text-ctp-blue">{rating.composite.toFixed(2)}</span></div>
      <div className="mt-3 space-y-2">{(["durability", "interaction", "aggro", "opportunity"] as RatingPillar[]).map((pillar) => <div key={pillar} className="flex items-center gap-2 text-sm"><span className="w-24 shrink-0 capitalize text-ctp-subtext1">{pillar}</span><div className="h-2 flex-1 rounded-full bg-ctp-surface0"><div className="h-2 rounded-full bg-ctp-blue" style={{ width: `${rating.scores[pillar] * 10}%` }} /></div><span className="w-6 shrink-0 text-right text-ctp-subtext0">{rating.scores[pillar]}</span></div>)}</div>
      <AggressionForecast forecast={aggressionForecast} />
    </section>

    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ctp-subtext0">Composition</h2>
      <p className="mt-1 text-sm text-ctp-subtext1">Floating Memory: {floatingMemory.base}{floatingMemory.classBonus > 0 && ` + ${floatingMemory.classBonus} class bonus`} · Average Ally Power: {allyPower.allyCopies > 0 ? allyPower.averagePower.toFixed(1) : "—"} · Champion damage: {damage.championRange.min}–{damage.championRange.max}</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <BarChart title="Memory Cost Curve" bars={memoryCurve} />
        <BarChart title="Reserve Cost Curve" bars={reserveCurve} />
        <RankedCompositionChart title="Card Types" segments={buildChartSegments(composition.types)} />
        <RankedCompositionChart title="Elements" segments={buildChartSegments(composition.elements)} />
        <RankedCompositionChart title="Card Subtypes" segments={buildChartSegments(composition.subtypes)} />
        <RankedCompositionChart title="Ally Power" segments={allyPowerSegments} />
        <RankedCompositionChart title="Keywords" segments={keywords} />
        <DonutChart title="Damage Targets" segments={buildChartSegments(damage.targets)} />
        <DonutChart title="Damage Type" segments={buildChartSegments(damage.conditionality)} />
      </div>
    </section>
  </div>;
}
