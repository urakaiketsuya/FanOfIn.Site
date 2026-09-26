import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { compareWinRatePackage, discoverWinRatePackages, splitPackageOutcomes, WIN_RATE_PACKAGE_DEFAULTS,
  type WinRatePackageFinding, type WinRatePackagesData, type DeckCardIndexData, type DeckSightingsData, type PackageCandidatesData, type PackageOutcomeRow } from "@gatcg/shared";

import { writeManifest } from "../manifest.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = async <T>(file: string): Promise<T> => JSON.parse(await readFile(path.join(root, "data/analysis", file), "utf8"));
const [index, sightings, existing] = await Promise.all([
  read<DeckCardIndexData>("deck-card-index.json"), read<DeckSightingsData>("deck-sightings.json"), read<PackageCandidatesData>("package-candidates.json"),
]);
const byId = new Map(index.decks.map((d) => [d.deckId, d]));
const cohorts = new Map<string, { champion: string; format: string; season: string; rows: PackageOutcomeRow[] }>();
const seenDecks = new Set<string>();
for (const s of sightings.sightings) {
  const deck = byId.get(s.deckId);
  if (!deck || !s.championName || s.seasonId === null || !Number.isFinite(Date.parse(s.eventDate)) ||
      s.wins + s.losses + s.ties <= 0 || !Number.isFinite(s.winRate) || s.winRate < 0 || s.winRate > 1 || seenDecks.has(s.deckId)) continue;
  seenDecks.add(s.deckId);
  const key = JSON.stringify([s.championName, s.format, s.seasonId]);
  const cohort = cohorts.get(key) ?? { champion: s.championName, format: s.format, season: s.seasonName ?? String(s.seasonId), rows: [] };
  cohort.rows.push({ cards: new Set([...deck.main, ...deck.material].filter(([, qty]) => qty > 0).map(([i]) => index.cardNames[i])),
    outcome: s.winRate, player: s.player, eventId: s.eventId, eventDate: s.eventDate });
  cohorts.set(key, cohort);
}
const existingSets = existing.candidates.map((c) => [...new Set([c.anchorCard, ...c.memberCards])].sort());
const results: WinRatePackageFinding[] = [];
let totalTested = 0, cohortsTested = 0;
for (const [key, cohort] of [...cohorts].sort(([a], [b]) => a.localeCompare(b))) {
  if (cohort.rows.length < 100 || new Set(cohort.rows.map((r) => r.eventDate.slice(0, 10))).size < 10) continue;
  const split = splitPackageOutcomes(cohort.rows);
  const mined = discoverWinRatePackages(split.discovery);
  totalTested += mined.tested;
  cohortsTested++;
  for (const finding of mined.findings) {
    const validation = compareWinRatePackage(split.validation, finding.cards);
    results.push({ cohort: key, champion: cohort.champion, format: cohort.format, season: cohort.season,
      validationStarts: split.cutoff, ...finding, validation,
      status: !validation.sufficient ? "insufficient-later-data" : validation.lift! > 0 && validation.weakestMemberLift! > 0 ? "positive-in-later-events" : "not-repeated",
      existingCandidateOverlap: existingSets.some((names) => JSON.stringify(names) === JSON.stringify(finding.cards)) ? "exact" :
        existingSets.some((names) => finding.cards.every((card) => names.includes(card)) || names.every((card) => finding.cards.includes(card))) ? "subset-or-superset" : "none",
    });
  }
  console.log(`${cohort.champion} / ${cohort.season}: ${mined.tested} tested, ${mined.findings.length} nominated`);
}
const output: WinRatePackagesData = { generatedAt: new Date().toISOString(), sourceGeneratedAt: sightings.generatedAt, settings: WIN_RATE_PACKAGE_DEFAULTS,
  cohortsTested, totalTested, results };
await writeFile(path.join(root, "data/analysis/win-rate-packages.json"), JSON.stringify(output), "utf8");
const pct = (n: number | null) => n === null ? "—" : `${(n * 100).toFixed(1)}%`;
const pp = (n: number | null) => n === null ? "—" : `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)} pp`;
const escaped = (s: string) => s.replaceAll("|", "\\|").replaceAll("\n", " ");
const positive = results.filter((r) => r.status === "positive-in-later-events");
const lines = ["# Win-rate package experiment", "", `Generated ${output.generatedAt}. Source snapshot: ${output.sourceGeneratedAt}.`, "",
  `Tested ${totalTested.toLocaleString()} group/cohort combinations across ${cohortsTested} Champion/format/season cohorts. Nominated ${results.length} groups from discovery data: ${positive.length} remained positive in every supported later-event comparison, ${results.filter((r) => r.status === "not-repeated").length} did not repeat, and ${results.filter((r) => r.status === "insufficient-later-data").length} lacked enough later data.`, "",
  "## Method and limits", "",
  "Main + Material presence only; quantities and sideboards excluded. Cohorts require 100 deck-events and 10 dates. Within each cohort the first 70% of distinct dates discover candidates; the remaining dates evaluate them. Events cannot cross the split. Every complete, incomplete, and exact missing-one bucket needs 10 decks, 5 players, and 3 events. Each player's average gets equal weight within a bucket; adjusted differences shrink toward the period's cohort average with a 10-player prior. Raw win rates are reported separately.", "",
  "Search covers up to 60 frequent cards, all pairs, then a 40-subset beam through triples and quadruples. Discovery requires at least +2 percentage points versus incomplete decks AND every exact missing-one group. Up to 10 candidates per cohort are retained by their weakest member difference. This bounded search can miss rare groups and groups with weak subsets. Later results never choose discovery candidates, and negative/unsupported later results remain in the JSON.", "",
  "Positive later differences are exploratory replication, not statistical significance or proof of synergy beyond individual card effects. No multiple-testing-adjusted confidence claim is made. Players may recur between periods; opponent strength, other deck choices, and within-season balance changes remain confounders. Comparisons are historical and may span different card legalities between seasons. Missing-one comparisons do not isolate a causal effect. Overlap compares the published mined co-occurrence candidates only, not registered rules or optional-member families.", "",
  "## Groups positive in later events", "",
  "Ordered by discovery strength; later outcomes are not used for ranking. Deck counts below are complete / incomplete. Open the JSON for all missing-one bucket counts, player/event counts, and rejected or unsupported candidates.", "",
  "| Cards | Champion / season | Later decks | Later raw WR: complete / incomplete | Later adjusted difference | Weakest later member difference | Co-occurrence overlap |",
  "|---|---|---|---|---|---|---|",
];
for (const r of [...positive].sort((a, b) => b.discovery.weakestMemberLift! - a.discovery.weakestMemberLift!)) {
  lines.push(`| ${escaped(r.cards.join(" + "))} | ${escaped(`${r.champion} / ${r.season}`)} | ${r.validation.complete.decks} / ${r.validation.incomplete.decks} | ${pct(r.validation.complete.winRate)} / ${pct(r.validation.incomplete.winRate)} | ${pp(r.validation.lift)} | ${pp(r.validation.weakestMemberLift)} | ${r.existingCandidateOverlap} |`);
}
if (!positive.length) lines.push("", "No nominated group met all later-event evidence gates. This does not establish that no effective packages exist.");
lines.push("", "## Discovery summary", "", ...[2, 3, 4].map((size) => `- ${size}-card groups: ${results.filter((r) => r.cards.length === size).length} nominated; ${positive.filter((r) => r.cards.length === size).length} positive with sufficient later evidence.`), "",
  `Among the ${positive.length} later-positive groups: ${positive.filter((r) => r.existingCandidateOverlap === "exact").length} exactly match an existing mined candidate, ${positive.filter((r) => r.existingCandidateOverlap === "subset-or-superset").length} are a subset/superset, and ${positive.filter((r) => r.existingCandidateOverlap === "none").length} have neither relationship.`, "",
  "Re-run: `npm run audit:win-rate-packages --workspace=pipeline`. Full results: `data/analysis/win-rate-packages.json`.", "");
await writeFile(path.join(root, "docs/WIN_RATE_PACKAGES_AUDIT.md"), lines.join("\n"), "utf8");
await writeManifest();
console.log(JSON.stringify({ cohortsTested, totalTested, nominated: results.length, positive: positive.length }));
