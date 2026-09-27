import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { DeckCardIndexData, PackageCandidatesData, WinRatePackagesData } from "@gatcg/shared";
import { measureMechanics, nominateMechanics, type MechanicsCard } from "./experimentalPackageMechanics.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = async <T>(file: string): Promise<T> => JSON.parse(await readFile(path.join(root, file), "utf8"));
const [catalog, index, existing, performance] = await Promise.all([
  read<{ fetchedAt: string; cards: MechanicsCard[] }>("pipeline/.cache/cards.json"),
  read<DeckCardIndexData>("data/analysis/deck-card-index.json"),
  read<PackageCandidatesData>("data/analysis/package-candidates.json"),
  read<WinRatePackagesData>("data/analysis/win-rate-packages.json"),
]);
const key = (names: string[]) => JSON.stringify([...new Set(names)].sort());
const findings = [...existing.candidates, ...existing.families.flatMap(f => f.sourceFindings ?? [])];
const candidates = measureMechanics(nominateMechanics(catalog.cards), index).map(c => ({
  ...c, reviewStatus: "unreviewed" as const,
  existingDiscoverySources: [...new Set(findings.filter(f => key([f.anchorCard, ...f.memberCards]) === key(c.cards)).flatMap(f => f.evidenceKinds))],
  // Reuse independently discovered evidence only; absence is not a failed performance test.
  performance: { status: "not-evaluated-by-this-method", existingFindings: performance.results.filter(f => key(f.cards) === key(c.cards)) },
}));
const output = { method: "mechanics-experiment-v1", generatedAt: new Date().toISOString(),
  sources: { catalog: catalog.fetchedAt, decks: index.generatedAt, discovery: existing.generatedAt, performance: performance.generatedAt },
  candidates };
// Separate experimental artifact: no registry or approval writes.
const published = path.join(root, "data/experiments");
await mkdir(published, { recursive: true });
await writeFile(path.join(published, "package-mechanics.json"), JSON.stringify(output) + "\n");
const out = path.join(root, "docs/experiments");
await mkdir(out, { recursive: true });
await writeFile(path.join(out, "package-mechanics.json"), JSON.stringify(output, null, 2) + "\n");
const esc = (s: string) => s.replaceAll("|", "\\|").replaceAll("\n", " ");
const lines = ["# Experimental mechanics discovery", "", `Generated ${output.generatedAt}. ${candidates.length} nominations.`, "",
  "Standalone candidate discovery. Shared subtype alone never qualifies. These results do not approve packages or enter Synergistic or deck recommendations.", "",
  "Main + Material deck-event usage across the historical snapshot; sideboards excluded. Counts are adoption evidence, not quality or causal performance. Same element or Norm + one element is a scope filter, not full deck legality. All interactions require review. Performance links are exact matches from the existing independent experiment; missing matches are untested.", "",
  "Run `npm run pipeline:packages:experimental` to regenerate this report and its JSON evidence.", "",
  "| Cards (source → target) | Interaction | Together / source decks | Events | Existing discovery | Performance matches |",
  "|---|---|---:|---:|---|---:|",
  ...candidates.map(c => `| ${c.cards.map(esc).join(" → ")} | ${c.interaction} | ${c.usage.togetherDecks} / ${c.usage.anchorDecks} | ${c.usage.events} | ${c.existingDiscoverySources.map(esc).join(", ") || "None"} | ${c.performance.existingFindings.length} |`), "",
  "The JSON retains printed rules text, interaction constraints, both inclusion directions, copy-count distributions, zero-use candidates, source timestamps and exact existing performance findings.", "",
];
await writeFile(path.join(out, "package-mechanics.md"), lines.join("\n"));
console.log(`Experimental mechanics: ${candidates.length} nominations; ${candidates.filter(c => c.usage.togetherDecks > 0).length} observed. Report: docs/experiments/package-mechanics.md`);
