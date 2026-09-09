import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { DeckFormat, OmnidexDecklist } from "@gatcg/shared";
import {
  computeAllyPower, computeDamageComposition, computeDeckComposition, computeDeckIdentity,
  computeFloatingMemory, computeKeywordComposition, computeMemoryCostCurve,
  computeRarityBreakdown, computeReserveCostCurve, formatAllyPower,
} from "../../lib/deckIdentity";
import { computeAggressionForecast } from "../../lib/aggressionForecast";
import { computeBreakthroughDamageVsAverage } from "../../lib/breakthroughDamage";
import BreakthroughDamagePanel from "../compare/BreakthroughDamagePanel";
import { computeDelugeForecasts, computeScavengeForecasts } from "../../lib/keywordForecast";
import { DelugeForecastList, ScavengeForecastList } from "../../components/KeywordForecastPanels";
import { buildDeckBuilderPath, deckBuilderParamsFromDecklist } from "../../lib/deckBuilderLink";
import { useCardsByNames } from "../events/useCardsByNames";
import { validateDeck, sideboardPointCost } from "../deckbuilder/validateDeck";
import { computeTrimPlan, computeCurvePeakCardNames, TRIM_TARGET_SIZE, type TrimSection } from "../deckbuilder/deckTrimming";
import { useChampionCardImpact } from "../decks/useChampionCardImpact";
import { useCardStatsData, useCardQuantityStatsData } from "../archetypes/data";
import AggressionForecast from "../decks/AggressionForecast";
import HypergeometricCalculator from "../deckbuilder/HypergeometricCalculator";
import TurnToPlayCalculator from "../deckbuilder/TurnToPlayCalculator";
import InteractiveCompositionProfile from "../../components/InteractiveCompositionProfile";
import CardPackageMap from "../../components/CardPackageMap";
import DonutChart, { buildChartSegments } from "../../components/DonutChart";
import RankedCompositionChart from "../../components/RankedCompositionChart";
import { useCardCatalog } from "../cards/useCardCatalog";
import { RARITY_LABELS } from "../packs/packOdds";
import { computeDependencyReadiness, computeSynergyReadiness } from "../deckbuilder/synergyReadiness";
import Panel from "../../components/ui/Panel";
import Section from "../../components/ui/Section";
import { InlineState } from "../../components/ui/ContentState";
import DeckChangeImpactPreview from "./DeckChangeImpactPreview";
import { applyDeckQuantityChanges, type DeckQuantityChange } from "../../lib/deckChangePreview";

const FINDING_TONE = { red: "danger", yellow: "warning", green: "success", blue: "info" } as const;

type Finding = { tone: "red" | "yellow" | "green" | "blue"; title: string; detail: string };
export interface DeckStatsTab { key: string; label: string; content: ReactNode }

function deckQuantities(decklist: OmnidexDecklist): Map<string, number> {
  const quantities = new Map<string, number>();
  for (const line of [...decklist.main, ...decklist.material, ...decklist.sideboard]) quantities.set(line.card, (quantities.get(line.card) ?? 0) + line.quantity);
  return quantities;
}

/** The Composition/Probability/Trim tab bar, plus any page-specific `extraTabs` (e.g.
 * DeckDetail.tsx's own tournament-only Matchups/Pricing) — one active panel at a time instead of a
 * stack of collapsed accordions, with a real tonal-fill/elevation selected state per the site's
 * Material Design convention rather than a plain border-color swap. */
function DeckStatsTabs({ tabs }: { tabs: DeckStatsTab[] }) {
  const [active, setActive] = useState(tabs[0]?.key);
  const current = tabs.find((t) => t.key === active) ?? tabs[0];
  if (!current) return null;
  return <div data-component="DeckStatsTabs">
    <div role="tablist" aria-label="Deck improvement tools" className="flex flex-wrap gap-2">
      {tabs.map((t) => {
        const selected = t.key === current.key;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => setActive(t.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 ease-out active:scale-[0.97] ${
              selected
                ? "bg-ctp-blue text-ctp-base shadow-md shadow-ctp-blue/20"
                : "border border-ctp-surface1 text-ctp-subtext1 hover:-translate-y-0.5 hover:border-ctp-surface2 hover:text-ctp-text hover:shadow-md hover:shadow-black/20"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
    <div role="tabpanel" className="mt-4">{current.content}</div>
  </div>;
}

export default function UserDeckStats({ decklist, championName, format, title, ownerDeckId, previousDecklist, extraTabs = [] }: { decklist: OmnidexDecklist; championName: string | null; format: DeckFormat; title: string; ownerDeckId?: string; previousDecklist?: OmnidexDecklist; extraTabs?: DeckStatsTab[] }) {
  const namedSections = useMemo(() => ({
    main: decklist.main.map((line) => ({ name: line.card, quantity: line.quantity })),
    material: decklist.material.map((line) => ({ name: line.card, quantity: line.quantity })),
    sideboard: decklist.sideboard.map((line) => ({ name: line.card, quantity: line.quantity })),
  }), [decklist]);
  const identityLines = useMemo(() => [...namedSections.main, ...namedSections.material], [namedSections]);
  const cardNames = useMemo(() => [...identityLines, ...namedSections.sideboard].map((line) => line.name), [identityLines, namedSections.sideboard]);
  const cardsByName = useCardsByNames(cardNames);
  const catalog = useCardCatalog();
  const identity = useMemo(() => computeDeckIdentity(identityLines, cardsByName), [identityLines, cardsByName]);
  const aggressionForecast = useMemo(
    () => computeAggressionForecast(namedSections.main, cardsByName, namedSections.material),
    [namedSections.main, namedSections.material, cardsByName],
  );
  const breakthroughVsAverage = useMemo(
    () => computeBreakthroughDamageVsAverage([...namedSections.main, ...namedSections.material], cardsByName),
    [namedSections.main, namedSections.material, cardsByName],
  );
  const scavengeForecasts = useMemo(() => computeScavengeForecasts(namedSections.main, cardsByName), [namedSections.main, cardsByName]);
  const delugeForecasts = useMemo(() => computeDelugeForecasts(namedSections.main, namedSections.material, cardsByName), [namedSections.main, namedSections.material, cardsByName]);
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
  const dependencyReadiness = useMemo(() => computeDependencyReadiness([
    ...namedSections.main.map((line) => ({ ...line, section: "main" as const })),
    ...namedSections.material.map((line) => ({ ...line, section: "material" as const })),
  ], cardsByName, catalog, new Set(identity.elements)), [namedSections.main, namedSections.material, cardsByName, catalog, identity.elements]);
  const validation = useMemo(() => validateDeck({
    main: decklist.main.map((line) => ({ cardName: line.card, quantity: line.quantity })),
    material: decklist.material.map((line) => ({ cardName: line.card, quantity: line.quantity })),
    sideboard: decklist.sideboard.map((line) => ({ cardName: line.card, quantity: line.quantity })),
  }, cardsByName, new Set(identity.elements), format), [decklist, cardsByName, identity.elements, format]);
  const builderParams = useMemo(() => deckBuilderParamsFromDecklist(decklist, cardsByName), [decklist, cardsByName]);
  const canImprove = Boolean(builderParams?.spiritFilter);
  const [selectedTrimSection, setSelectedTrimSection] = useState<TrimSection | null>(null);
  const [stagedCuts, setStagedCuts] = useState<Set<string>>(new Set());
  const [stagedAdditions, setStagedAdditions] = useState<Set<string>>(new Set());
  const noExclusions = useMemo(() => new Set<string>(), []);
  // Tournament-only data — Pantheon decks share Champion names with Standard tournament decks but
  // are a genuinely different population (different construction rules, no tournament results of
  // their own), so never let Standard win-rate evidence leak into a Pantheon deck's trim suggestions.
  const impactResult = useChampionCardImpact(format === "PANTHEON" ? null : championName, identity.elements, noExclusions, "all");
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
  const previewCardsByName = useMemo(() => new Map([...cardsByName, ...catalog.map((card) => [card.name, card] as const)]), [cardsByName, catalog]);
  const stagedChanges = useMemo<DeckQuantityChange[]>(() => [
    ...(["main", "material", "sideboard"] as TrimSection[]).flatMap((section) =>
      (trimPlans[section]?.candidates ?? [])
        .filter((candidate) => stagedCuts.has(candidate.cardName))
        .map((candidate) => ({ cardName: candidate.cardName, section, delta: -candidate.cutQuantity })),
    ),
    ...[...stagedAdditions].map((cardName) => {
      const card = previewCardsByName.get(cardName);
      const section = card?.types.some((type) => type === "CHAMPION" || type === "REGALIA") ? "material" as const : "main" as const;
      return { cardName, section, delta: 1 };
    }),
  ], [previewCardsByName, stagedAdditions, stagedCuts, trimPlans]);
  const stagedDecklist = useMemo(() => applyDeckQuantityChanges(decklist, stagedChanges), [decklist, stagedChanges]);
  const stagedBuilderParams = useMemo(() => deckBuilderParamsFromDecklist(stagedDecklist, previewCardsByName), [previewCardsByName, stagedDecklist]);
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
  // `cardsByName` resolves via its own independent Dexie query, separate from whatever loaded
  // `decklist` itself — on a cold cache it can lag several seconds behind, during which composition
  // computes against an effectively empty card map, rendering genuinely empty charts with no
  // indication anything was still loading. Same 90%-coverage gate used across every deck-viewing
  // page.
  const resolvedMainCount = useMemo(
    () => namedSections.main.reduce((sum, line) => sum + (cardsByName.has(line.name) ? line.quantity : 0), 0),
    [namedSections.main, cardsByName],
  );
  const catalogCoverage = totals.main > 0 ? resolvedMainCount / totals.main : 0;

  const versionChange = useMemo(() => {
    if (!previousDecklist) return null;
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
    return { added, removed, changedCards };
  }, [decklist, previousDecklist]);
  const findings = useMemo<Finding[]>(() => {
    const result: Finding[] = [];
    if (coverage.unresolved.length > 0) result.push({ tone: "yellow", title: "Incomplete card data", detail: `${coverage.unresolved.length} card name${coverage.unresolved.length === 1 ? " is" : "s are"} unresolved, so computed scores and charts may be incomplete.` });
    if (validation.status !== "Legal") result.push({ tone: "red", title: `${validation.status} construction`, detail: validation.reasons[0] ?? "Review the construction rules before playing this list." });
    if (trimPlans.main) result.push({ tone: "yellow", title: `Main deck is ${trimPlans.main.overBy} card${trimPlans.main.overBy === 1 ? "" : "s"} over target`, detail: `${trimPlans.main.currentSize} cards vs. a 60-card target — extra cards dilute consistency. See "Trim & packages" for ranked cut suggestions.` });
    const weakSynergy = synergyReadiness.find((entry) => entry.status === "Unlikely" || entry.status === "Fragile");
    if (weakSynergy) result.push({ tone: "yellow", title: `${weakSynergy.label} is ${weakSynergy.status.toLowerCase()}`, detail: `${weakSynergy.enablerCopies} eligible copies give a ${(weakSynergy.probabilityByTen * 100).toFixed(0)}% theoretical chance by 10 cards seen.` });
    const weakPackage = dependencyReadiness.find((entry) => entry.status !== "Supported");
    if (weakPackage) result.push({ tone: "yellow", title: `${weakPackage.label}: ${weakPackage.status}`, detail: `${weakPackage.producerCopies} producer copies support ${weakPackage.consumerCopies} consumer copies.` });
    if (result.length === 0) result.push({ tone: "green", title: "No immediate structural warnings", detail: "The construction check and detected card packages look supported. Use the builder review for matchup-aware tuning." });
    return result.slice(0, 5);
  }, [coverage.unresolved.length, dependencyReadiness, synergyReadiness, validation, trimPlans.main]);

  // `cardsByName` (a per-name Dexie query) and `catalog` (the full-list Dexie query) are two
  // independent async queries against the same synced IndexedDB — nothing guarantees they resolve
  // in lockstep. Gating on both being empty (an earlier version of this check) let `cardsByName`
  // sit stale-empty any time `catalog` alone happened to load first, flashing "0 resolved"/
  // "unresolved card names" findings and an "Incomplete" legality status on a cold cache. Gate on
  // `cardsByName` alone instead — that's the one this whole component actually depends on.
  if (cardNames.length > 0 && cardsByName.size === 0) return <Panel data-component="UserDeckStats" className="mt-6"><InlineState className="text-sm">Resolving card data and calculating deck analytics…</InlineState></Panel>;

  const validationTone = validation.status === "Legal" ? "border-ctp-green/50 bg-ctp-green/10 text-ctp-green" : validation.status === "Illegal" ? "border-ctp-red/50 bg-ctp-red/10 text-ctp-red" : "border-ctp-yellow/50 bg-ctp-yellow/10 text-ctp-yellow";

  const compositionTab: ReactNode = catalogCoverage < 0.9 ? (
    <Panel tone="warning" className="text-sm text-ctp-subtext1">
      Composition is waiting for card data: {resolvedMainCount} of {totals.main} main-deck cards resolved. Charts appear at 90% coverage.
    </Panel>
  ) : (
    <>
      <p className="text-sm text-ctp-subtext1">
        Floating Memory: {floatingMemory.base}{floatingMemory.classBonus > 0 ? ` + ${floatingMemory.classBonus} class bonus` : ""} · Average Ally Power: {allyPower.allyCopies > 0 ? formatAllyPower(allyPower) : "—"} · Champion damage: {damage.championRange.min}–{damage.championRange.max} · Ally damage: {damage.allyRange.min}–{damage.allyRange.max}
      </p>
      <div className="mt-3">
        <InteractiveCompositionProfile composition={composition} memoryCurve={memoryCurve} reserveCurve={reserveCurve} lines={[...decklist.main, ...decklist.material]} cardsByName={cardsByName} />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <RankedCompositionChart title="Rarity" segments={rarity} />
        <RankedCompositionChart title="Ally Power" segments={allyPowerSegments} />
        <RankedCompositionChart title="Keywords" segments={keywords} />
        <DonutChart title="Damage Targets" segments={buildChartSegments(damage.targets)} />
        <DonutChart title="Damage Type" segments={buildChartSegments(damage.conditionality)} />
      </div>
    </>
  );

  // Same emptiness check AggressionForecast.tsx uses internally to return null — mirrored here so
  // a deck with no *printed* damage text (spells/abilities) shows an explicit, correctly-scoped
  // note instead of the forecast just silently not being there, which reads as broken rather than
  // as a true, checked answer. This is genuinely common: most decks in this game win through combat
  // (allies attacking, a champion swinging with a weapon), not burn — computeAggressionForecast
  // only ever parsed "Deal N damage" text, so "nothing found" here does NOT mean "this deck can't
  // deal damage." Rather than just disclaiming that in text, fall back to the Breakthrough damage
  // estimate (against a calibrated "average deck" Intercept count, since there's no second decklist
  // to compare against here) so a combat-plan deck still gets a real number instead of a shrug.
  const hasDamageForecast = aggressionForecast.fixedDamageCopies > 0 || aggressionForecast.variableDamageCopies > 0
    || aggressionForecast.scalingDamageCopies > 0 || aggressionForecast.ambiguousDamageCopies > 0 || aggressionForecast.recurringDamagePerTurn > 0;
  const probabilityTab: ReactNode = (
    <>
      <Panel>
        {hasDamageForecast ? (
          <AggressionForecast forecast={aggressionForecast} />
        ) : breakthroughVsAverage.attackerCount > 0 ? (
          <div data-component="BreakthroughDamageFallback">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Combat damage forecast</h3>
            <div className="mt-3">
              <BreakthroughDamagePanel attackerLabel={title} defenderLabel="an average deck" result={breakthroughVsAverage} />
            </div>
          </div>
        ) : (
          <InlineState className="text-sm">No printed spell/ability damage and no attacking allies found in this list.</InlineState>
        )}
      </Panel>
      {allyPower.allyCopies > 0 && hasDamageForecast && (
        <Panel className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Combat potential</h3>
          <p className="mt-1 max-w-3xl text-xs text-ctp-subtext0">
            {allyPower.allyCopies} all{allyPower.allyCopies === 1 ? "y" : "ies"} averaging {formatAllyPower(allyPower)} power.
          </p>
        </Panel>
      )}
      {scavengeForecasts.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Scavenge</h3>
          <div className="mt-2"><ScavengeForecastList forecasts={scavengeForecasts} /></div>
        </div>
      )}
      {delugeForecasts.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Deluge</h3>
          <div className="mt-2"><DelugeForecastList forecasts={delugeForecasts} /></div>
        </div>
      )}
      <div className="mt-4">
        <HypergeometricCalculator mainLines={namedSections.main} materialLines={namedSections.material} catalogByName={cardsByName} />
      </div>
      <div className="mt-4">
        <TurnToPlayCalculator mainLines={namedSections.main} catalogByName={cardsByName} />
      </div>
    </>
  );

  const hasTrimOrPackages = overTrimSections.length > 0 || synergyReadiness.length > 0 || dependencyReadiness.length > 0;
  const trimTab: ReactNode = (
    <>
      {stagedChanges.length > 0 && <DeckChangeImpactPreview decklist={decklist} changes={stagedChanges} cardsByName={previewCardsByName} format={format} />}
      {stagedChanges.length > 0 && <Panel tone="info" className="mb-5 sticky top-16 z-20 shadow-lg"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-ctp-blue">Proposed changes</p><p className="mt-1 text-sm text-ctp-text">{stagedCuts.size} cut{stagedCuts.size === 1 ? "" : "s"} · {stagedAdditions.size} addition{stagedAdditions.size === 1 ? "" : "s"} staged</p><p className="mt-1 text-xs text-ctp-subtext1">{[...stagedCuts, ...stagedAdditions].join(" · ")}</p></div><div className="flex gap-2"><button type="button" onClick={() => { setStagedCuts(new Set()); setStagedAdditions(new Set()); }} className="rounded-md px-3 py-2 text-xs text-ctp-subtext1 hover:bg-ctp-surface0">Clear</button>{stagedBuilderParams && <Link to={buildDeckBuilderPath(stagedBuilderParams.championName, stagedBuilderParams.spiritFilter, stagedBuilderParams.lockedCards, stagedBuilderParams.lockedSections, ownerDeckId && canImprove ? { mode: "improve", sourceDeckId: ownerDeckId } : undefined)} className="rounded-md bg-ctp-blue px-3 py-2 text-xs font-medium text-ctp-base">Review and apply →</Link>}</div></div></Panel>}
      {overTrimSections.length > 0 && activeTrimPlan && (
        <Section heading="compact" title="Trim to size" description="Ranked cut suggestions from quantity-vs-optimal, Champion-scoped win-rate lift, and cost-curve evidence already computed elsewhere on the site. Price is shown for reference and never used to rank a card.">
          <div className="mt-3 flex flex-wrap gap-2">
            {overTrimSections.map((section) => {
              const plan = trimPlans[section];
              if (!plan) return null;
              return <button key={section} type="button" onClick={() => setSelectedTrimSection(section)} className={`rounded-md border px-3 py-1.5 text-sm capitalize transition-all duration-200 active:scale-[0.97] ${activeTrimSection === section ? "border-ctp-blue bg-ctp-blue/10 text-ctp-blue shadow-md shadow-ctp-blue/20" : "border-ctp-surface1 text-ctp-subtext1 hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/20"}`}>{section} ({plan.overBy} {plan.unit} over)</button>;
            })}
          </div>
          <p className="mt-3 text-xs text-ctp-subtext1">{activeTrimPlan.currentSize}/{activeTrimPlan.targetSize} {activeTrimPlan.unit} — cut at least {activeTrimPlan.overBy} to reach target.</p>
          <ul className="mt-3 space-y-2">
            {activeTrimPlan.candidates.map((candidate) => <li key={candidate.cardName} className="rounded-md border border-ctp-surface1 p-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-ctp-text">{candidate.remainingQuantity > 0 ? `Cut ${candidate.cutQuantity}x (keep ${candidate.remainingQuantity}x)` : `Cut all ${candidate.cutQuantity}x`} {candidate.cardName}</span>
                <div className="flex items-center gap-2">{candidate.priceEach !== null && <span className="text-xs text-ctp-subtext0">${(candidate.priceEach * candidate.cutQuantity).toFixed(2)} saved</span>}<button type="button" aria-pressed={stagedCuts.has(candidate.cardName)} onClick={() => setStagedCuts((current) => { const next = new Set(current); if (next.has(candidate.cardName)) next.delete(candidate.cardName); else next.add(candidate.cardName); return next; })} className={`rounded-md border px-2.5 py-1.5 text-xs font-medium ${stagedCuts.has(candidate.cardName) ? "border-ctp-blue bg-ctp-blue text-ctp-base" : "border-ctp-surface1 text-ctp-subtext1 hover:border-ctp-blue"}`}>{stagedCuts.has(candidate.cardName) ? "Staged ✓" : "Stage cut"}</button></div>
              </div>
              <p className="mt-1 text-xs text-ctp-subtext1">{candidate.detail}</p>
            </li>)}
          </ul>
          {builderParams && <Link to={buildDeckBuilderPath(builderParams.championName, builderParams.spiritFilter, builderParams.lockedCards, builderParams.lockedSections, ownerDeckId && canImprove ? { mode: "improve", sourceDeckId: ownerDeckId } : undefined)} className="mt-3 inline-block text-sm text-ctp-blue hover:underline">Full guardrail-aware review in the Deck Builder →</Link>}
        </Section>
      )}
      {(synergyReadiness.length > 0 || dependencyReadiness.length > 0) && (
        <Section heading="compact" className={overTrimSections.length > 0 ? "mt-6" : undefined} title="Package map" description="Detected relationships across Main and Material.">
          <div className="mt-3"><CardPackageMap synergies={synergyReadiness} dependencies={dependencyReadiness} cardsByName={previewCardsByName} previewedCards={stagedAdditions} onTogglePreview={(cardName) => setStagedAdditions((current) => { const next = new Set(current); if (next.has(cardName)) next.delete(cardName); else next.add(cardName); return next; })} /></div>
        </Section>
      )}
      {!hasTrimOrPackages && <InlineState className="text-sm">No cuts needed and no card packages detected in this list.</InlineState>}
    </>
  );

  const tabs: DeckStatsTab[] = [
    { key: "improvements", label: "Improvements", content: trimTab },
    { key: "composition", label: "Composition", content: compositionTab },
    { key: "forecasts", label: "Forecasts", content: probabilityTab },
    ...extraTabs,
  ];

  return <div data-component="UserDeckStats" className="mt-6 space-y-6">
    <Panel aria-labelledby="analysis-findings">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="analysis-findings" className="font-semibold text-ctp-text">Key findings</h2><p className="mt-1 text-xs text-ctp-subtext0">Prioritized structural signals from this exact list.</p></div>{ownerDeckId && builderParams && canImprove && <Link to={buildDeckBuilderPath(builderParams.championName, builderParams.spiritFilter, builderParams.lockedCards, builderParams.lockedSections, { mode: "improve", sourceDeckId: ownerDeckId })} className="rounded-md bg-ctp-blue px-3 py-1.5 text-sm text-ctp-base">Review improvements</Link>}</div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">{findings.map((finding) => <Panel key={`${finding.title}:${finding.detail}`} tone={FINDING_TONE[finding.tone]} padding="sm"><p className="text-sm font-semibold text-ctp-text">{finding.title}</p><p className="mt-1 text-xs text-ctp-subtext1">{finding.detail}</p></Panel>)}</div>
      {versionChange && <p className="mt-3 border-t border-ctp-surface1 pt-2 text-xs text-ctp-subtext1">Since the previous version: {versionChange.added} copies added · {versionChange.removed} removed · {versionChange.changedCards} card entries changed.</p>}
    </Panel>

    <section className={`rounded-lg border px-3 py-2.5 ${validationTone}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><h2 className="text-sm font-semibold">{validation.status}</h2><p className="text-xs opacity-80">Main {totals.main} · Material {totals.material} · Sideboard {totals.sideboard}</p>{validation.reasons.length > 0 && <details className="ml-auto text-xs"><summary className="cursor-pointer font-medium">{validation.reasons.length} issue{validation.reasons.length === 1 ? "" : "s"}</summary><ul className="mt-2 max-w-2xl list-disc space-y-1 pl-5">{validation.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></details>}</div>
    </section>

    <DeckStatsTabs tabs={tabs} />
  </div>;
}
