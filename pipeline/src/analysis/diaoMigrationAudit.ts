import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computeDeckRating, DIAO_MODEL_VERSION, type DeckRating, type RatingPillar } from "@gatcg/shared";
import { buildCardIndex, loadCardCatalog } from "../cards/catalog.js";
import { listCachedBundles } from "../omnidex/cache.js";
import { buildEventDeckSignatures } from "./decklists.js";
import { computeDiaoV1Rating, scoreDiaoV1Points } from "./diaoV1Legacy.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const OUTPUT = path.join(ROOT, "data/analysis/diao-v2-migration.json");
const TAXONOMY = path.join(ROOT, "data/analysis/archetype-taxonomy.json");
const PILLARS: RatingPillar[] = ["durability", "interaction", "aggro", "opportunity"];

interface Row {
  deckId: string;
  date: string;
  event: string;
  player: string;
  champion: string;
  archetype: string | null;
  old: DeckRating;
  semanticOnly: DeckRating["scores"];
  next: DeckRating;
}

const round = (value: number, digits = 4) => +value.toFixed(digits);
const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const percentile = (values: number[], p: number) => values[Math.min(values.length - 1, Math.floor((values.length - 1) * p))] ?? 0;

function deltaSummary(rows: Row[]) {
  const metrics = ["composite", ...PILLARS] as const;
  return Object.fromEntries(metrics.map((metric) => {
    const deltas = rows.map((row) => metric === "composite" ? row.next.composite - row.old.composite : row.next.scores[metric] - row.old.scores[metric]).sort((a, b) => a - b);
    return [metric, {
      mean: round(mean(deltas)),
      p10: round(percentile(deltas, .1)),
      median: round(percentile(deltas, .5)),
      p90: round(percentile(deltas, .9)),
      decreasedRate: round(deltas.filter((value) => value < 0).length / Math.max(1, deltas.length)),
      unchangedRate: round(deltas.filter((value) => value === 0).length / Math.max(1, deltas.length)),
      increasedRate: round(deltas.filter((value) => value > 0).length / Math.max(1, deltas.length)),
    }];
  }));
}

function decompositionSummary(rows: Row[]) {
  const metrics = ["composite", ...PILLARS] as const;
  const value = (scores: DeckRating["scores"], metric: typeof metrics[number]) => metric === "composite"
    ? (scores.durability + scores.interaction + scores.aggro + scores.opportunity) / 4
    : scores[metric];
  return Object.fromEntries(metrics.map((metric) => {
    const semantic = rows.map((row) => value(row.semanticOnly, metric) - value(row.old.scores, metric));
    const calibration = rows.map((row) => value(row.next.scores, metric) - value(row.semanticOnly, metric));
    return [metric, { meanSemanticDelta: round(mean(semantic)), meanCalibrationDelta: round(mean(calibration)), meanTotalDelta: round(mean(semantic) + mean(calibration)) }];
  }));
}

function signalChangeSummary(rows: Row[]) {
  const signals = Object.keys(rows[0]?.next.signals ?? {}) as (keyof DeckRating["signals"])[];
  const entries: [string, { changedDecks: number; changedRate: number; increasedDecks: number; decreasedDecks: number; meanDeltaWhenChanged: number }][] = [];
  for (const signal of signals) {
    const deltas = rows.map((row) => row.next.signals[signal] - row.old.signals[signal]);
    const changed = deltas.filter((delta) => delta !== 0);
    if (!changed.length) continue;
    entries.push([signal, {
      changedDecks: changed.length,
      changedRate: round(changed.length / Math.max(1, rows.length)),
      increasedDecks: changed.filter((delta) => delta > 0).length,
      decreasedDecks: changed.filter((delta) => delta < 0).length,
      meanDeltaWhenChanged: round(mean(changed)),
    }]);
  }
  return Object.fromEntries(entries);
}

function groupSummary(rows: Row[], key: (row: Row) => string | null, minimum: number) {
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const name = key(row);
    if (!name) continue;
    const group = groups.get(name) ?? [];
    group.push(row);
    groups.set(name, group);
  }
  return Array.from(groups, ([name, group]) => ({ name, decks: group.length, deltas: deltaSummary(group) }))
    .filter((group) => group.decks >= minimum)
    .sort((a, b) => Math.abs(b.deltas.composite.mean) - Math.abs(a.deltas.composite.mean) || b.decks - a.decks || a.name.localeCompare(b.name));
}

function representative(row: Row) {
  return {
    deckId: row.deckId, date: row.date, event: row.event, player: row.player, champion: row.champion, archetype: row.archetype,
    v1: { scores: row.old.scores, composite: row.old.composite },
    v2SignalsOnV1Bands: { scores: row.semanticOnly, composite: round((row.semanticOnly.durability + row.semanticOnly.interaction + row.semanticOnly.aggro + row.semanticOnly.opportunity) / 4, 2) },
    v2: { scores: row.next.scores, composite: row.next.composite },
    scoreDelta: Object.fromEntries(PILLARS.map((pillar) => [pillar, row.next.scores[pillar] - row.old.scores[pillar]])),
    signalDelta: Object.fromEntries(Object.keys(row.next.signals).map((signal) => [signal, round(row.next.signals[signal as keyof typeof row.next.signals] - row.old.signals[signal as keyof typeof row.old.signals])]).filter(([, value]) => value !== 0)),
  };
}

async function main(): Promise<void> {
  const [catalog, bundles, taxonomyRaw] = await Promise.all([loadCardCatalog(), listCachedBundles(), readFile(TAXONOMY, "utf-8")]);
  const taxonomy = JSON.parse(taxonomyRaw) as { clusters: { name: string; deckIds: string[] }[] };
  const archetypeByDeck = new Map(taxonomy.clusters.flatMap((cluster) => cluster.deckIds.map((deckId) => [deckId, cluster.name] as const)));
  const cardIndex = buildCardIndex(catalog);
  const rows: Row[] = [];
  for (const bundle of bundles) {
    if (bundle.event.status !== "complete" || "error" in bundle.decklists || "error" in bundle.standings) continue;
    const signatures = buildEventDeckSignatures(bundle.decklists, cardIndex);
    const playerNames = new Map(bundle.players.map((player) => [player.id, player.username]));
    const standings = new Map(bundle.standings.standings.filter((standing) => standing.id !== undefined).map((standing) => [standing.id!, standing]));
    for (const [playerId, deck] of signatures) {
      const standing = standings.get(playerId);
      if (!standing || !deck.championName || deck.unmatchedCardNames.length || standing.statsWins + standing.statsLosses + standing.statsTies < 2) continue;
      const lines = [...deck.mainCards, ...deck.materialCards];
      const deckId = `${bundle.id}:${playerId}`;
      const old = computeDiaoV1Rating(lines, cardIndex, deck.championName, deck.classes);
      const next = computeDeckRating(lines, cardIndex, deck.championName, deck.classes);
      rows.push({
        deckId, date: bundle.event.date, event: bundle.event.name, player: playerNames.get(playerId) ?? String(playerId), champion: deck.championName,
        archetype: archetypeByDeck.get(deckId) ?? null,
        old, semanticOnly: scoreDiaoV1Points(next.points), next,
      });
    }
  }
  rows.sort((a, b) => a.date.localeCompare(b.date) || a.deckId.localeCompare(b.deckId));
  const byMagnitude = [...rows].sort((a, b) => Math.abs(b.next.composite - b.old.composite) - Math.abs(a.next.composite - a.old.composite) || a.deckId.localeCompare(b.deckId));
  const changedSignals = rows.filter((row) => Object.keys(representative(row).signalDelta).length > 0);
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    migration: { from: 1, to: DIAO_MODEL_VERSION },
    sample: { decks: rows.length, archetypeAssignedDecks: rows.filter((row) => row.archetype).length, champions: new Set(rows.map((row) => row.champion)).size },
    overall: deltaSummary(rows),
    scoreChangeDecomposition: decompositionSummary(rows),
    correctedSignals: signalChangeSummary(rows),
    byChampion: groupSummary(rows, (row) => row.champion, 20),
    byArchetype: groupSummary(rows, (row) => row.archetype, 20),
    representativeDecks: {
      largestCompositeChanges: byMagnitude.slice(0, 20).map(representative),
      correctedSignalDetection: changedSignals.sort((a, b) => Math.abs(b.next.composite - b.old.composite) - Math.abs(a.next.composite - a.old.composite) || a.deckId.localeCompare(b.deckId)).slice(0, 20).map(representative),
    },
    interpretation: [
      "Score-change decomposition applies v2 points to v1 bands first, then v2 bands. It separates semantic/formula movement from calibration movement, but the attribution is order-dependent near thresholds.",
      "Durability intentionally falls for ally-heavy decks because v2 removes generic threats from that pillar.",
      "Signal deltas identify decks affected by corrected draw, Recover, or Negate parsing; unchanged signals with changed scores indicate calibration-only movement.",
      "Archetype summaries include only named taxonomy clusters with at least 20 audited decks; unassigned decks remain in overall and champion summaries.",
    ],
  };
  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf-8");
  console.log(`DIAO migration audit: ${rows.length} decks (${changedSignals.length} with corrected signals) -> ${path.relative(ROOT, OUTPUT)}`);
}

await main();
