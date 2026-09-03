import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { DeckFormat, OmnidexDecklist } from "@gatcg/shared";
import {
  computeAllyPower, computeDamageComposition, computeDeckComposition, computeDeckIdentity,
  computeDeckRating, computeFloatingMemory, computeKeywordComposition, computeMemoryCostCurve,
  computeRarityBreakdown, computeReserveCostCurve, formatAllyPower, type RatingPillar,
} from "../../lib/deckIdentity";
import { computeAggressionForecast } from "../../lib/aggressionForecast";
import { buildDeckBuilderPath, deckBuilderParamsFromDecklist } from "../../lib/deckBuilderLink";
import { encodeCustomDecks } from "../../lib/compareShareLink";
import { useCardsByNames } from "../events/useCardsByNames";
import { validateDeck, sideboardPointCost } from "../deckbuilder/validateDeck";
import { computeTrimPlan, computeCurvePeakCardNames, TRIM_TARGET_SIZE, type TrimSection } from "../deckbuilder/deckTrimming";
import { useChampionCardImpact } from "../decks/useChampionCardImpact";
import { useCardStatsData, useCardQuantityStatsData } from "../archetypes/data";
import AggressionForecast from "../decks/AggressionForecast";
import CompositionChartGrid from "../../components/CompositionChartGrid";
import { DependencyReadinessEntries, SynergyReadinessEntries } from "../../components/DeckReadinessSection";
import DonutChart, { buildChartSegments } from "../../components/DonutChart";
import RankedCompositionChart from "../../components/RankedCompositionChart";
import { useCardCatalog } from "../cards/useCardCatalog";
import { RARITY_LABELS } from "../packs/packOdds";
import { computeDependencyReadiness, computeSynergyReadiness } from "../deckbuilder/synergyReadiness";
import Panel from "../../components/ui/Panel";
import Section from "../../components/ui/Section";
import { InlineState } from "../../components/ui/ContentState";

const FINDING_TONE = { red: "danger", yellow: "warning", green: "success", blue: "info" } as const;

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
  const [selectedTrimSection, setSelectedTrimSection] = useState<TrimSection | null>(null);
  const noExclusions = useMemo(() => new Set<string>(), []);
  const impactResult = useChampionCardImpact(championName, identity.elements, noExclusions, "all");
  const impactByName = useMemo(() => new Map(impactResult.cards.map((c) => [c.cardName, c])), [impactResult.cards]);
  const cardStatsData = useCardStatsData();
  const priceByName = useMemo(() => new Map((cardStatsData?.cards ?? []).map((c) => [c.name, c.marketPrice])), [cardStatsData]);
  const quantityStatsData = useCardQuantityStatsData();
  const quantityBucketsByName = useMemo(() => new Map((quantityStatsData?.cards ?? []).map((c) => [c.name, c.quantities])), [quantityStatsData]);
  const curvePeakCardNames = useMemo(() => new Set([
    ...computeCurvePeakCardNames(namedSections.main.map((l) => ({ cardName: l.name, quantity: l.quantity })), cardsByName, "cost_memory"),
    ...computeCurvePeakCardNames(namedSections.main.map((l) => ({ cardName: l.name, quantity: l.quantity })), cardsByName, "cost_reserve"),
  ]), [namedSections.main, cardsByName]);
  const trimPlans = useMemo(() => ({
    main: computeTrimPlan("main", namedSections.main.map((l) => ({ cardName: l.name, quantity: l.quantity })), cardsByName, TRIM_TARGET_SIZE.main, { impactByName, quantityBucketsByName, priceByName, curvePeakCardNames }),
    material: computeTrimPlan("material", namedSections.material.map((l) => ({ cardName: l.name, quantity: l.quantity })), cardsByName, TRIM_TARGET_SIZE.material, { impactByName, quantityBucketsByName, priceByName }),
    sideboard: computeTrimPlan("sideboard", namedSections.sideboard.map((l) => ({ cardName: l.name, quantity: l.quantity })), cardsByName, TRIM_TARGET_SIZE.sideboard, { impactByName, quantityBucketsByName, priceByName, pointCost: sideboardPointCost }),
  }), [namedSections, cardsByName, impactByName, quantityBucketsByName, priceByName, curvePeakCardNames]);
  const overTrimSections = (["main", "material", "sideboard"] as TrimSection[]).filter((s) => trimPlans[s] !== null);
  const activeTrimSection = selectedTrimSection && trimPlans[selectedTrimSection] ? selectedTrimSection : (overTrimSections[0] ?? null);
  const activeTrimPlan = activeTrimSection ? trimPlans[activeTrimSection] : null;
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
    if (trimPlans.main) result.push({ tone: "yellow", title: `Main deck is ${trimPlans.main.overBy} card${trimPlans.main.overBy === 1 ? "" : "s"} over target`, detail: `${trimPlans.main.currentSize} cards vs. a 60-card target — extra cards dilute consistency. See "Trim to size" below for ranked cut suggestions.` });
    const weakSynergy = synergyReadiness.find((entry) => entry.status === "Unlikely" || entry.status === "Fragile");
    if (weakSynergy) result.push({ tone: "yellow", title: `${weakSynergy.label} is ${weakSynergy.status.toLowerCase()}`, detail: `${weakSynergy.enablerCopies} eligible copies give a ${(weakSynergy.probabilityByTen * 100).toFixed(0)}% theoretical chance by 10 cards seen.` });
    const weakPackage = dependencyReadiness.find((entry) => entry.status !== "Supported");
    if (weakPackage) result.push({ tone: "yellow", title: `${weakPackage.label}: ${weakPackage.status}`, detail: `${weakPackage.producerCopies} producer copies support ${weakPackage.consumerCopies} consumer copies.` });
    if (result.length === 0) result.push({ tone: "green", title: "No immediate structural warnings", detail: "The construction check and detected card packages look supported. Use the builder review for matchup-aware tuning." });
    return result.slice(0, 5);
  }, [coverage.unresolved.length, dependencyReadiness, synergyReadiness, validation, trimPlans.main]);

  if (cardNames.length > 0 && cardsByName.size === 0 && catalog.length === 0) return <Panel className="mt-6"><InlineState className="text-sm">Resolving card data and calculating deck analytics…</InlineState></Panel>;

  const validationTone = validation.status === "Legal" ? "border-ctp-green/50 bg-ctp-green/10 text-ctp-green" : validation.status === "Illegal" ? "border-ctp-red/50 bg-ctp-red/10 text-ctp-red" : "border-ctp-yellow/50 bg-ctp-yellow/10 text-ctp-yellow";
  return <div className="mt-6 space-y-6">
    <Panel aria-labelledby="analysis-findings">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="analysis-findings" className="font-semibold text-ctp-text">Key findings</h2><p className="mt-1 text-xs text-ctp-subtext0">Prioritized structural signals from this exact list.</p></div>{ownerDeckId && builderParams && canImprove && <Link to={buildDeckBuilderPath(builderParams.championName, builderParams.spiritFilter, builderParams.lockedCards, builderParams.lockedSections, { mode: "improve", sourceDeckId: ownerDeckId })} className="rounded-md bg-ctp-blue px-3 py-1.5 text-sm text-ctp-base">Review improvements</Link>}</div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">{findings.map((finding) => <Panel key={`${finding.title}:${finding.detail}`} tone={FINDING_TONE[finding.tone]} padding="sm"><p className="text-sm font-semibold text-ctp-text">{finding.title}</p><p className="mt-1 text-xs text-ctp-subtext1">{finding.detail}</p></Panel>)}</div>
    </Panel>

    <Panel tone={coverage.unresolved.length > 0 ? "warning" : "default"}>
      <Section heading="dense" title="Analysis coverage" actions={<span className="text-sm font-semibold text-ctp-text">{coverage.resolvedCopies}/{coverage.totalCopies} copies resolved</span>}>
        <p className="mt-1 text-xs text-ctp-subtext1">{coverage.uniqueResolved}/{coverage.uniqueTotal} unique cards matched the local card catalog. Composition analytics use main + material; sideboard cards are included only in legality and coverage.</p>
        {coverage.unresolved.length > 0 && <p className="mt-2 text-xs text-ctp-yellow">Not resolved: {coverage.unresolved.join(", ")}. Fix these names before relying on scores or charts.</p>}
        {versionChange && <p className="mt-2 border-t border-current/10 pt-2 text-xs text-ctp-subtext1">Since the previous version: {versionChange.added} copies added · {versionChange.removed} removed · {versionChange.changedCards} card entries changed · DIAO {versionChange.scoreDelta > 0 ? "+" : ""}{versionChange.scoreDelta.toFixed(2)}.</p>}
      </Section>
    </Panel>

    <section className={`rounded-lg border p-4 ${validationTone}`}>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">{validation.status}</h2><p className="mt-1 text-xs opacity-80">Main {totals.main} · Material {totals.material} · Sideboard {totals.sideboard}</p></div><div className="flex flex-wrap gap-2"><Link to={`/compare?custom=${encodeURIComponent(encodeCustomDecks([{ label: title, decklist, format }]))}`} className="rounded-md border border-current px-3 py-1.5 text-sm">Compare deck</Link>{builderParams && <Link to={buildDeckBuilderPath(builderParams.championName, builderParams.spiritFilter, builderParams.lockedCards, builderParams.lockedSections)} className="rounded-md border border-current px-3 py-1.5 text-sm">Continue in Deck Builder</Link>}{builderParams && ownerDeckId && canImprove && <Link to={buildDeckBuilderPath(builderParams.championName, builderParams.spiritFilter, builderParams.lockedCards, builderParams.lockedSections, { mode: "improve", sourceDeckId: ownerDeckId })} className="rounded-md bg-current px-3 py-1.5 text-sm"><span className="text-ctp-base">Improve this deck</span></Link>}</div></div>
      {validation.reasons.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{validation.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
      <p className="mt-3 text-[11px] opacity-70">Static construction check only; event-specific rules and card-text exceptions still require an official source.</p>
    </section>

    {overTrimSections.length > 0 && activeTrimPlan && <Section heading="compact" collapsible defaultOpen title="Trim to size" description="Ranked cut suggestions from quantity-vs-optimal, Champion-scoped win-rate lift, and cost-curve evidence already computed elsewhere on the site. Price is shown for reference and never used to rank a card.">
      <div className="mt-3 flex flex-wrap gap-2">
        {overTrimSections.map((section) => {
          const plan = trimPlans[section];
          if (!plan) return null;
          return <button key={section} type="button" onClick={() => setSelectedTrimSection(section)} className={`rounded-md border px-3 py-1.5 text-sm capitalize ${activeTrimSection === section ? "border-ctp-blue bg-ctp-blue/10 text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1"}`}>{section} ({plan.overBy} {plan.unit} over)</button>;
        })}
      </div>
      <p className="mt-3 text-xs text-ctp-subtext1">{activeTrimPlan.currentSize}/{activeTrimPlan.targetSize} {activeTrimPlan.unit} — cut at least {activeTrimPlan.overBy} to reach target.</p>
      <ul className="mt-3 space-y-2">
        {activeTrimPlan.candidates.map((candidate) => <li key={candidate.cardName} className="rounded-md border border-ctp-surface1 p-2 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-ctp-text">{candidate.remainingQuantity > 0 ? `Cut ${candidate.cutQuantity}x (keep ${candidate.remainingQuantity}x)` : `Cut all ${candidate.cutQuantity}x`} {candidate.cardName}</span>
            {candidate.priceEach !== null && <span className="text-xs text-ctp-subtext0">${(candidate.priceEach * candidate.cutQuantity).toFixed(2)} saved</span>}
          </div>
          <p className="mt-1 text-xs text-ctp-subtext1">{candidate.detail}</p>
        </li>)}
      </ul>
      {builderParams && <Link to={buildDeckBuilderPath(builderParams.championName, builderParams.spiritFilter, builderParams.lockedCards, builderParams.lockedSections, ownerDeckId && canImprove ? { mode: "improve", sourceDeckId: ownerDeckId } : undefined)} className="mt-3 inline-block text-sm text-ctp-blue hover:underline">Full guardrail-aware review in the Deck Builder →</Link>}
    </Section>}

    <Panel aria-labelledby="user-deck-score">
      <Section heading="dense" title="DIAO Score" description="Calculated from this exact decklist." actions={<span className="text-2xl font-bold text-ctp-blue">{rating.composite.toFixed(2)}</span>}>
        <div className="mt-3 space-y-2">{(["durability", "interaction", "aggro", "opportunity"] as RatingPillar[]).map((pillar) => <div key={pillar} className="flex items-center gap-2 text-sm"><span className="w-24 shrink-0 capitalize text-ctp-subtext1">{pillar}</span><div className="h-2 flex-1 rounded-full bg-ctp-surface0"><div className="h-2 rounded-full bg-ctp-blue" style={{ width: `${rating.scores[pillar] * 10}%` }} /></div><span className="w-6 shrink-0 text-right text-ctp-subtext0">{rating.scores[pillar]}</span></div>)}</div>
        <AggressionForecast forecast={aggressionForecast} />
      </Section>
    </Panel>

    <Section heading="compact" collapsible defaultOpen={false} title="Composition" description={`Floating Memory: ${floatingMemory.base}${floatingMemory.classBonus > 0 ? ` + ${floatingMemory.classBonus} class bonus` : ""} · Average Ally Power: ${allyPower.allyCopies > 0 ? formatAllyPower(allyPower) : "—"} · Champion damage: ${damage.championRange.min}–${damage.championRange.max} · Ally damage: ${damage.allyRange.min}–${damage.allyRange.max}`}>
      <div className="mt-3">
        <CompositionChartGrid composition={composition} memoryCurve={memoryCurve} reserveCurve={reserveCurve} />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <RankedCompositionChart title="Rarity" segments={rarity} />
        <RankedCompositionChart title="Ally Power" segments={allyPowerSegments} />
        <RankedCompositionChart title="Keywords" segments={keywords} />
        <DonutChart title="Damage Targets" segments={buildChartSegments(damage.targets)} />
        <DonutChart title="Damage Type" segments={buildChartSegments(damage.conditionality)} />
      </div>
    </Section>

    {(synergyReadiness.length > 0 || dependencyReadiness.length > 0) && <Section heading="compact" collapsible defaultOpen={false} title="Package readiness" description="Detected relationships in the main deck. Probabilities measure card availability, not guaranteed activation.">
      <div className="mt-3 space-y-3">
        <SynergyReadinessEntries items={synergyReadiness} variant="compact" />
        <DependencyReadinessEntries items={dependencyReadiness} variant="compact" />
      </div>
    </Section>}
  </div>;
}
