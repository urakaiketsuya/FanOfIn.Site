import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cardPillarScore, computeDeckRating, type DeckRating, type RatingPillar } from "@gatcg/shared";
import { buildCardIndex, loadCardCatalog } from "../cards/catalog.js";
import { buildEventDeckSignatures } from "./decklists.js";
import { listCachedBundles } from "../omnidex/cache.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const OUTPUT = path.join(ROOT, "data/analysis/diao-model-audit.json");
const PILLARS: RatingPillar[] = ["durability", "interaction", "aggro", "opportunity"];

interface Row {
  deckId: string;
  eventId: number;
  date: string;
  champion: string;
  classes: string[];
  eventPlayers: number;
  matchWinRate: number;
  placementPercentile: number;
  rating: DeckRating;
  lines: { name: string; quantity: number }[];
}

function mean(xs: number[]): number { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0; }
function round(value: number, digits = 4): number { return +value.toFixed(digits); }
function pearson(xs: number[], ys: number[]): number {
  if (xs.length < 3 || xs.length !== ys.length) return 0;
  const mx = mean(xs), my = mean(ys);
  const numerator = xs.reduce((sum, x, i) => sum + (x - mx) * (ys[i] - my), 0);
  const dx = Math.sqrt(xs.reduce((sum, x) => sum + (x - mx) ** 2, 0));
  const dy = Math.sqrt(ys.reduce((sum, y) => sum + (y - my) ** 2, 0));
  return dx && dy ? numerator / (dx * dy) : 0;
}
function ranks(values: number[]): number[] {
  const sorted = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const result = new Array<number>(values.length);
  for (let i = 0; i < sorted.length;) {
    let j = i + 1;
    while (j < sorted.length && sorted[j].value === sorted[i].value) j++;
    const rank = (i + j - 1) / 2 + 1;
    for (let k = i; k < j; k++) result[sorted[k].index] = rank;
    i = j;
  }
  return result;
}
function spearman(xs: number[], ys: number[]): number { return pearson(ranks(xs), ranks(ys)); }
function centered(rows: Row[], value: (row: Row) => number, group: (row: Row) => string): number[] {
  const groups = new Map<string, number[]>();
  for (const row of rows) {
    const key = group(row);
    const values = groups.get(key) ?? [];
    values.push(value(row));
    groups.set(key, values);
  }
  const means = new Map(Array.from(groups, ([key, values]) => [key, mean(values)]));
  return rows.map((row) => value(row) - means.get(group(row))!);
}
function correlationBlock(rows: Row[]) {
  const win = rows.map((r) => r.matchWinRate);
  const placement = rows.map((r) => r.placementPercentile);
  const result: Record<string, unknown> = { decks: rows.length };
  for (const metric of ["composite", ...PILLARS] as const) {
    const score = rows.map((r) => metric === "composite" ? r.rating.composite : r.rating.scores[metric]);
    const metricValue = (r: Row) => metric === "composite" ? r.rating.composite : r.rating.scores[metric];
    result[metric] = {
      winRateSpearman: round(spearman(score, win)),
      placementSpearman: round(spearman(score, placement)),
      championControlledWinPearson: round(pearson(centered(rows, metricValue, (r) => r.champion), centered(rows, (r) => r.matchWinRate, (r) => r.champion))),
      eventControlledWinPearson: round(pearson(centered(rows, metricValue, (r) => String(r.eventId)), centered(rows, (r) => r.matchWinRate, (r) => String(r.eventId)))),
      eventSizeControlledWinPearson: round(pearson(centered(rows, metricValue, (r) => String(Math.ceil(r.eventPlayers / 16) * 16)), centered(rows, (r) => r.matchWinRate, (r) => String(Math.ceil(r.eventPlayers / 16) * 16)))),
    };
  }
  return result;
}

async function main(): Promise<void> {
  const [catalog, bundles] = await Promise.all([loadCardCatalog(), listCachedBundles()]);
  const cardIndex = buildCardIndex(catalog);
  const rows: Row[] = [];
  for (const bundle of bundles) {
    if (bundle.event.status !== "complete" || "error" in bundle.decklists || "error" in bundle.standings) continue;
    const signatures = buildEventDeckSignatures(bundle.decklists, cardIndex);
    const standings = new Map(bundle.standings.standings.filter((s) => s.id !== undefined).map((s) => [s.id!, s]));
    for (const [player, deck] of signatures) {
      const standing = standings.get(player);
      if (!standing || !deck.championName || deck.unmatchedCardNames.length || standing.statsWins + standing.statsLosses + standing.statsTies < 2) continue;
      const lines = [...deck.mainCards, ...deck.materialCards];
      const rating = computeDeckRating(lines, cardIndex, deck.championName, deck.classes);
      const matches = standing.statsWins + standing.statsLosses + standing.statsTies;
      rows.push({
        deckId: `${bundle.id}:${player}`, eventId: bundle.id, date: bundle.event.date,
        champion: deck.championName, classes: deck.classes, eventPlayers: bundle.players.length,
        matchWinRate: (standing.statsWins + 0.5 * standing.statsTies) / matches,
        placementPercentile: bundle.players.length > 1 && standing.finalPlacement ? 1 - (standing.finalPlacement - 1) / (bundle.players.length - 1) : 0.5,
        rating, lines,
      });
    }
  }
  rows.sort((a, b) => a.date.localeCompare(b.date) || a.deckId.localeCompare(b.deckId));
  const split = Math.floor(rows.length * 0.7);
  const holdoutStartDate = rows[split]?.date ?? "";
  const developmentRows = rows.filter((row) => row.date < holdoutStartDate);
  const holdoutRows = rows.filter((row) => row.date >= holdoutStartDate);

  const distributions: Record<string, unknown> = {};
  for (const metric of ["composite", ...PILLARS] as const) {
    const values = rows.map((r) => metric === "composite" ? r.rating.composite : r.rating.scores[metric]).sort((a, b) => a - b);
    const percentile = (p: number) => values[Math.min(values.length - 1, Math.floor((values.length - 1) * p))] ?? 0;
    const entry: Record<string, unknown> = { min: values[0] ?? 0, p10: percentile(.1), median: percentile(.5), p90: percentile(.9), max: values.at(-1) ?? 0, distinctValues: new Set(values).size };
    if (metric !== "composite") {
      const raw = rows.map((r) => r.rating.points[metric]).sort((a, b) => a - b);
      const rawPercentile = (p: number) => raw[Math.min(raw.length - 1, Math.floor((raw.length - 1) * p))] ?? 0;
      entry.rawPoints = { min: round(raw[0] ?? 0), p10: round(rawPercentile(.1)), median: round(rawPercentile(.5)), p90: round(rawPercentile(.9)), max: round(raw.at(-1) ?? 0) };
      entry.floorRate = round(values.filter((value) => value === 3).length / values.length);
      entry.ceilingRate = round(values.filter((value) => value === 10).length / values.length);
    }
    distributions[metric] = entry;
  }

  const mutationSample = rows.filter((_, i) => i % Math.max(1, Math.floor(rows.length / 500)) === 0).slice(0, 500);
  const mutationResults: Record<string, unknown> = {};
  for (const pillar of PILLARS) {
    const candidate = catalog.filter((c) => !c.types.includes("CHAMPION")).sort((a, b) => cardPillarScore(b, pillar) - cardPillarScore(a, pillar))[0];
    let nonDecreasing = 0, strictlyIncreasing = 0, scoreIncreasing = 0;
    const targetDeltas: number[] = [], offTargetDeltas: number[] = [];
    for (const row of mutationSample) {
      const changed = row.lines.map((line) => ({ ...line }));
      const existing = changed.find((line) => line.name === candidate.name);
      if (existing) existing.quantity += 1; else changed.push({ name: candidate.name, quantity: 1 });
      const next = computeDeckRating(changed, cardIndex, row.champion, row.classes);
      const delta = next.points[pillar] - row.rating.points[pillar];
      targetDeltas.push(delta);
      if (delta >= -1e-9) nonDecreasing++;
      if (delta > 1e-9) strictlyIncreasing++;
      if (next.scores[pillar] > row.rating.scores[pillar]) scoreIncreasing++;
      for (const other of PILLARS) if (other !== pillar) offTargetDeltas.push(next.points[other] - row.rating.points[other]);
    }
    mutationResults[pillar] = { probeCard: candidate.name, probeCardScore: round(cardPillarScore(candidate, pillar)), decks: mutationSample.length, nonDecreasingRate: round(nonDecreasing / mutationSample.length), strictlyIncreasingRate: round(strictlyIncreasing / mutationSample.length), scoreBandIncreaseRate: round(scoreIncreasing / mutationSample.length), meanTargetPointDelta: round(mean(targetDeltas)), meanOffTargetPointDelta: round(mean(offTargetDeltas)) };
  }

  const stylePairs: Record<string, unknown> = {};
  for (const pillar of PILLARS) {
    const byChampion = new Map<string, Row[]>();
    for (const row of rows) { const group = byChampion.get(row.champion) ?? []; group.push(row); byChampion.set(row.champion, group); }
    const pairs = Array.from(byChampion.values()).filter((group) => group.length >= 20).map((group) => {
      const sorted = [...group].sort((a, b) => a.rating.points[pillar] - b.rating.points[pillar]);
      return { low: sorted[Math.floor(sorted.length * .2)], high: sorted[Math.floor(sorted.length * .8)] };
    });
    stylePairs[pillar] = { championsTested: pairs.length, orderedScoreRate: round(pairs.filter((p) => p.high.rating.scores[pillar] > p.low.rating.scores[pillar]).length / Math.max(1, pairs.length)), meanScoreSeparation: round(mean(pairs.map((p) => p.high.rating.scores[pillar] - p.low.rating.scores[pillar]))) };
  }

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    model: { name: "DIAO", implementation: "@gatcg/shared computeDeckRating", calibrationStatus: "Existing fixed bands; this audit does not refit them." },
    sample: { decks: rows.length, events: new Set(rows.map((r) => r.eventId)).size, champions: new Set(rows.map((r) => r.champion)).size, firstEventDate: rows[0]?.date ?? null, lastEventDate: rows.at(-1)?.date ?? null, exclusions: "Incomplete events, private/missing decklists or standings, unmatched cards, unknown champions, and fewer than two recorded matches." },
    scoreDistributions: distributions,
    knownStylePairDiagnostics: { note: "Within each champion with >=20 lists, compares the 20th/80th-percentile real decks by raw pillar evidence. This is a face-validity/separation check, not independent expert labeling.", pillars: stylePairs },
    controlledMutations: { note: "Adds one copy of the catalog card with the strongest isolated signal for each pillar to up to 500 deterministic real decks. Checks direction, threshold sensitivity, and spillover; legality and deck-size validity are intentionally irrelevant to this formula test.", pillars: mutationResults },
    tournamentOutcomes: {
      interpretation: "DIAO is primarily a style/profile score. Weak outcome correlation is acceptable; a strong composite correlation would support a secondary power claim. Controlled correlations remove champion or event means, but remain observational and do not establish causality.",
      all: correlationBlock(rows),
      chronologicalSplitDate: holdoutStartDate,
      chronologicalDevelopment70Percent: correlationBlock(developmentRows),
      chronologicalHoldout30Percent: correlationBlock(holdoutRows),
    },
    limitations: ["No expert-label construct-validity sample (explicitly excluded from this audit).", "Tournament decklists are selected competitive lists, so range restriction suppresses correlations.", "Match records do not control for pilot skill, matchup, opponent strength, or card legality changes.", "Known-style pairs are based on the model's raw evidence and therefore test score-band separation, not independent semantic truth.", "Mutation probes test formula behavior, not whether adding the card improves a legal deck."],
  };
  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf-8");
  console.log(`DIAO audit: ${rows.length} decks across ${report.sample.events} events -> ${path.relative(ROOT, OUTPUT)}`);
}

await main();
