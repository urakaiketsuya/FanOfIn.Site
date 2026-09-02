import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { DeckFormat, OmnidexDecklist } from "@gatcg/shared";
import {
  computeAllyPower, computeDamageComposition, computeDeckComposition, computeDeckIdentity,
  computeDeckRating, computeFloatingMemory, computeKeywordComposition, computeMemoryCostCurve,
  computeRarityBreakdown, computeReserveCostCurve, type RatingPillar,
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
import { useCardCatalog } from "../cards/useCardCatalog";
import { RARITY_LABELS } from "../packs/packOdds";
import { computeDependencyReadiness, computeSynergyReadiness } from "../deckbuilder/synergyReadiness";

type Finding = { tone: "red" | "yellow" | "green" | "blue"; title: string; detail: string };

function deckQuantities(decklist: OmnidexDecklist): Map<string, number> {
  const quantities = new Map<string, number>();
  for (const line of [...decklist.main, ...decklist.material, ...decklist.sideboard]) quantities.set(line.card, (quantities.get(line.card) ?? 0) + line.quantity);
  return quantities;
}

export default function UserDeckStats({ decklist, championName, format, title, ownerDeckId, previousDecklist }: { decklist: OmnidexDecklist; championName: string | null; format: DeckFormat; title: string; ownerDeckId?: string; previousDecklist?: OmnidexDecklist }) {
  const namedSections = useMemo(() => ({
    main: decklist.main.map((line) => ({ name: line.card, quantity: line.quantity })),
    material: decklist.material.map((line) => ({ name: line.card, quantity: line.quantity })),
    sideboard: decklist.sideboard.map((line) => ({ name: line.card, quantity: line.quantity })),
  }), [decklist]);
  const identityLines = useMemo(() => [...namedSections.main, ...namedSections.material], [namedSections]);
  const cardNames = useMemo(() => [...identityLines, ...namedSections.sideboard].map((line) => line.name), [identityLines, namedSections.sideboard]);
  const cardsByName = useCardsByNames(cardNames);
  const catalog = useCardCatalog();
  const catalogByName = useMemo(() => new Map(catalog.map((card) => [card.name, card])), [catalog]);
  const identity = useMemo(() => computeDeckIdentity(identityLines, cardsByName), [identityLines, cardsByName]);
  const rating = useMemo(() => computeDeckRating(identityLines, cardsByName, championName, identity.classes), [identityLines, cardsByName, championName, identity.classes]);
  const aggressionForecast = useMemo(
    () => computeAggressionForecast(namedSections.main, cardsByName, namedSections.material),
    [namedSections.main, namedSections.material, cardsByName],
  );
  const composition = useMemo(() => computeDeckComposition(identityLines, cardsByName), [identityLines, cardsByName]);
  const memoryCurve = useMemo(() => computeMemoryCostCurve(identityLines, cardsByName), [identityLines, cardsByName]);
  const reserveCurve = useMemo(() => computeReserveCostCurve(identityLines, cardsByName), [identityLines, cardsByName]);
  const keywords = useMemo(() => buildChartSegments(computeKeywordComposition(identityLines, cardsByName)), [identityLines, cardsByName]);
  const allyPower = useMemo(() => computeAllyPower(identityLines, cardsByName), [identityLines, cardsByName]);
  const allyPowerSegments = useMemo(() => buildChartSegments(new Map(Array.from(allyPower.byPower, ([power, count]) => [`Power ${power}`, count]))), [allyPower]);
  const damage = useMemo(() => computeDamageComposition(identityLines, cardsByName), [identityLines, cardsByName]);
  const floatingMemory = useMemo(() => computeFloatingMemory(identityLines, cardsByName, championName, identity.classes), [identityLines, cardsByName, championName, identity.classes]);
  const rarity = useMemo(() => buildChartSegments(new Map(Array.from(computeRarityBreakdown(identityLines, cardsByName), ([value, count]) => [RARITY_LABELS[value] ?? `Rarity ${value}`, count]))), [identityLines, cardsByName]);
  const synergyReadiness = useMemo(() => computeSynergyReadiness(namedSections.main, cardsByName, catalog, new Set(identity.elements)), [namedSections.main, cardsByName, catalog, identity.elements]);
  const dependencyReadiness = useMemo(() => computeDependencyReadiness(namedSections.main, cardsByName, catalog, new Set(identity.elements)), [namedSections.main, cardsByName, catalog, identity.elements]);
  const validation = useMemo(() => validateDeck({
    main: decklist.main.map((line) => ({ cardName: line.card, quantity: line.quantity })),
    material: decklist.material.map((line) => ({ cardName: line.card, quantity: line.quantity })),
    sideboard: decklist.sideboard.map((line) => ({ cardName: line.card, quantity: line.quantity })),
  }, cardsByName, new Set(identity.elements), format), [decklist, cardsByName, identity.elements, format]);
  const builderParams = useMemo(() => deckBuilderParamsFromDecklist(decklist, cardsByName), [decklist, cardsByName]);
  const canImprove = Boolean(builderParams?.spiritFilter);
  const totals = useMemo(() => ({
    main: decklist.main.reduce((sum, line) => sum + line.quantity, 0),
    material: decklist.material.reduce((sum, line) => sum + line.quantity, 0),
    sideboard: decklist.sideboard.reduce((sum, line) => sum + line.quantity, 0),
  }), [decklist]);
  const coverage = useMemo(() => {
    const uniqueNames = [...new Set(cardNames)];
    const unresolved = uniqueNames.filter((name) => !cardsByName.has(name));
    const totalCopies = [...namedSections.main, ...namedSections.material, ...namedSections.sideboard].reduce((sum, line) => sum + line.quantity, 0);
    const resolvedCopies = [...namedSections.main, ...namedSections.material, ...namedSections.sideboard].reduce((sum, line) => sum + (cardsByName.has(line.name) ? line.quantity : 0), 0);
    return { unresolved, uniqueTotal: uniqueNames.length, uniqueResolved: uniqueNames.length - unresolved.length, totalCopies, resolvedCopies };
  }, [cardNames, cardsByName, namedSections]);
  const versionChange = useMemo(() => {
    if (!previousDecklist || catalogByName.size === 0) return null;
    const before = deckQuantities(previousDecklist);
    const after = deckQuantities(decklist);
    const names = new Set([...before.keys(), ...after.keys()]);
    let added = 0; let removed = 0; let changedCards = 0;
    for (const name of names) {
      const delta = (after.get(name) ?? 0) - (before.get(name) ?? 0);
      if (delta === 0) continue;
      changedCards++;
      if (delta > 0) added += delta; else removed -= delta;
    }
    const previousLines = [...previousDecklist.main, ...previousDecklist.material].map((line) => ({ name: line.card, quantity: line.quantity }));
    const previousIdentity = computeDeckIdentity(previousLines, catalogByName);
    const previousRating = computeDeckRating(previousLines, catalogByName, championName, previousIdentity.classes);
    return { added, removed, changedCards, scoreDelta: rating.composite - previousRating.composite };
  }, [catalogByName, championName, decklist, previousDecklist, rating.composite]);
  const findings = useMemo<Finding[]>(() => {
    const result: Finding[] = [];
    if (coverage.unresolved.length > 0) result.push({ tone: "yellow", title: "Incomplete card data", detail: `${coverage.unresolved.length} card name${coverage.unresolved.length === 1 ? " is" : "s are"} unresolved, so computed scores and charts may be incomplete.` });
    if (validation.status !== "Legal") result.push({ tone: "red", title: `${validation.status} construction`, detail: validation.reasons[0] ?? "Review the construction rules before playing this list." });
    const weakSynergy = synergyReadiness.find((entry) => entry.status === "Unlikely" || entry.status === "Fragile");
    if (weakSynergy) result.push({ tone: "yellow", title: `${weakSynergy.label} is ${weakSynergy.status.toLowerCase()}`, detail: `${weakSynergy.enablerCopies} eligible copies give a ${(weakSynergy.probabilityByTen * 100).toFixed(0)}% theoretical chance by 10 cards seen.` });
    const weakPackage = dependencyReadiness.find((entry) => entry.status !== "Supported");
    if (weakPackage) result.push({ tone: "yellow", title: `${weakPackage.label}: ${weakPackage.status}`, detail: `${weakPackage.producerCopies} producer copies support ${weakPackage.consumerCopies} consumer copies.` });
    if (result.length === 0) result.push({ tone: "green", title: "No immediate structural warnings", detail: "The construction check and detected card packages look supported. Use the builder review for matchup-aware tuning." });
    return result.slice(0, 5);
  }, [coverage.unresolved.length, dependencyReadiness, synergyReadiness, validation]);

  if (cardNames.length > 0 && cardsByName.size === 0 && catalog.length === 0) return <section className="mt-6 rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4 text-sm text-ctp-subtext1">Resolving card data and calculating deck analytics…</section>;

  const validationTone = validation.status === "Legal" ? "border-ctp-green/50 bg-ctp-green/10 text-ctp-green" : validation.status === "Illegal" ? "border-ctp-red/50 bg-ctp-red/10 text-ctp-red" : "border-ctp-yellow/50 bg-ctp-yellow/10 text-ctp-yellow";
  return <div className="mt-6 space-y-6">
    <section className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4" aria-labelledby="analysis-findings">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="analysis-findings" className="font-semibold text-ctp-text">Key findings</h2><p className="mt-1 text-xs text-ctp-subtext0">Prioritized structural signals from this exact list.</p></div>{ownerDeckId && builderParams && canImprove && <Link to={buildDeckBuilderPath(builderParams.championName, builderParams.spiritFilter, builderParams.lockedCards, builderParams.lockedSections, { mode: "improve", sourceDeckId: ownerDeckId })} className="rounded-md bg-ctp-blue px-3 py-1.5 text-sm text-ctp-base">Review improvements</Link>}</div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">{findings.map((finding) => <div key={`${finding.title}:${finding.detail}`} className={`rounded-md border p-3 ${finding.tone === "red" ? "border-ctp-red/40 bg-ctp-red/10" : finding.tone === "yellow" ? "border-ctp-yellow/40 bg-ctp-yellow/10" : finding.tone === "green" ? "border-ctp-green/40 bg-ctp-green/10" : "border-ctp-blue/40 bg-ctp-blue/10"}`}><p className="text-sm font-semibold text-ctp-text">{finding.title}</p><p className="mt-1 text-xs text-ctp-subtext1">{finding.detail}</p></div>)}</div>
    </section>

    <section className={`rounded-lg border p-4 ${coverage.unresolved.length > 0 ? "border-ctp-yellow/50 bg-ctp-yellow/10" : "border-ctp-surface1 bg-ctp-mantle"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Analysis coverage</h2><span className="text-sm font-semibold text-ctp-text">{coverage.resolvedCopies}/{coverage.totalCopies} copies resolved</span></div>
      <p className="mt-1 text-xs text-ctp-subtext1">{coverage.uniqueResolved}/{coverage.uniqueTotal} unique cards matched the local card catalog. Composition analytics use main + material; sideboard cards are included only in legality and coverage.</p>
      {coverage.unresolved.length > 0 && <p className="mt-2 text-xs text-ctp-yellow">Not resolved: {coverage.unresolved.join(", ")}. Fix these names before relying on scores or charts.</p>}
      {versionChange && <p className="mt-2 border-t border-current/10 pt-2 text-xs text-ctp-subtext1">Since the previous version: {versionChange.added} copies added · {versionChange.removed} removed · {versionChange.changedCards} card entries changed · DIAO {versionChange.scoreDelta > 0 ? "+" : ""}{versionChange.scoreDelta.toFixed(2)}.</p>}
    </section>

    <section className={`rounded-lg border p-4 ${validationTone}`}>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">{validation.status}</h2><p className="mt-1 text-xs opacity-80">Main {totals.main} · Material {totals.material} · Sideboard {totals.sideboard}</p></div><div className="flex flex-wrap gap-2"><Link to={`/compare?custom=${encodeURIComponent(encodeCustomDecks([{ label: title, decklist, format }]))}`} className="rounded-md border border-current px-3 py-1.5 text-sm">Compare deck</Link>{builderParams && <Link to={buildDeckBuilderPath(builderParams.championName, builderParams.spiritFilter, builderParams.lockedCards, builderParams.lockedSections)} className="rounded-md border border-current px-3 py-1.5 text-sm">Continue in Deck Builder</Link>}{builderParams && ownerDeckId && canImprove && <Link to={buildDeckBuilderPath(builderParams.championName, builderParams.spiritFilter, builderParams.lockedCards, builderParams.lockedSections, { mode: "improve", sourceDeckId: ownerDeckId })} className="rounded-md bg-current px-3 py-1.5 text-sm"><span className="text-ctp-base">Improve this deck</span></Link>}</div></div>
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
      <p className="mt-1 text-sm text-ctp-subtext1">Floating Memory: {floatingMemory.base}{floatingMemory.classBonus > 0 && ` + ${floatingMemory.classBonus} class bonus`} · Average Ally Power: {allyPower.allyCopies > 0 ? allyPower.averagePower.toFixed(1) : "—"} · Champion damage: {damage.championRange.min}–{damage.championRange.max} · Ally damage: {damage.allyRange.min}–{damage.allyRange.max}</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <BarChart title="Memory Cost Curve" bars={memoryCurve} />
        <BarChart title="Reserve Cost Curve" bars={reserveCurve} />
        <RankedCompositionChart title="Card Types" segments={buildChartSegments(composition.types)} />
        <RankedCompositionChart title="Elements" segments={buildChartSegments(composition.elements)} />
        <RankedCompositionChart title="Card Subtypes" segments={buildChartSegments(composition.subtypes)} />
        <RankedCompositionChart title="Rarity" segments={rarity} />
        <RankedCompositionChart title="Ally Power" segments={allyPowerSegments} />
        <RankedCompositionChart title="Keywords" segments={keywords} />
        <DonutChart title="Damage Targets" segments={buildChartSegments(damage.targets)} />
        <DonutChart title="Damage Type" segments={buildChartSegments(damage.conditionality)} />
      </div>
    </section>

    {(synergyReadiness.length > 0 || dependencyReadiness.length > 0) && <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ctp-subtext0">Package readiness</h2>
      <p className="mt-1 text-sm text-ctp-subtext1">Detected relationships in the main deck. Probabilities measure card availability, not guaranteed activation.</p>
      <div className="mt-3 space-y-3">
        {synergyReadiness.map((entry) => <article key={entry.key} className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold text-ctp-text">{entry.label}</h3><span className={entry.status === "Reliable" ? "text-ctp-green" : entry.status === "Playable" ? "text-ctp-blue" : "text-ctp-yellow"}>{entry.status} · {(entry.probabilityByTen * 100).toFixed(0)}% by 10 seen</span></div><p className="mt-2 text-xs text-ctp-subtext1">{entry.enablerCopies} eligible copies · {entry.payoffCopies} payoff copies. {entry.note}</p>{entry.recommendations.length > 0 && <p className="mt-1 text-xs text-ctp-blue">Potential enablers to review: {entry.recommendations.join(", ")}</p>}</article>)}
        {dependencyReadiness.map((entry) => <article key={entry.key} className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold capitalize text-ctp-text">{entry.label}</h3><span className={entry.status === "Supported" ? "text-ctp-green" : "text-ctp-yellow"}>{entry.status}</span></div><p className="mt-2 text-xs text-ctp-subtext1">{entry.producerCopies} producer copies · {entry.consumerCopies} consumer copies. {entry.note}</p>{entry.recommendations.length > 0 && <p className="mt-1 text-xs text-ctp-blue">Potential support to review: {entry.recommendations.join(", ")}</p>}</article>)}
      </div>
    </section>}
  </div>;
}
