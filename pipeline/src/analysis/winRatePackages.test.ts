import assert from "node:assert/strict";
import test from "node:test";
import { compareWinRatePackage, discoverWinRatePackages, packageOutcomeBucket, splitPackageOutcomes, type PackageOutcomeRow } from "@gatcg/shared";

function group(cards: string[], outcome: number, offset = 0, n = 12): PackageOutcomeRow[] {
  return Array.from({ length: n }, (_, i) => ({ cards: new Set(cards), outcome, player: offset + i,
    eventId: i % 3, eventDate: `2026-01-${String(i % 3 + 1).padStart(2, "0")}` }));
}
test("missing-one excludes the full package and decks missing multiple members", () => {
  const rows = [...group(["A", "B", "C"], 0.8), ...group(["A", "B"], 0.4, 20),
    ...group(["A", "C"], 0.45, 40), ...group(["B", "C"], 0.5, 60), ...group([], 0.2, 80)];
  const result = compareWinRatePackage(rows, ["A", "B", "C"]);
  assert.equal(result.complete.decks, 12);
  assert.equal(result.incomplete.decks, 48);
  assert.deepEqual(result.missingOne.map((r) => r.bucket.decks), [12, 12, 12]);
  assert.ok(result.sufficient);
  assert.ok(result.weakestMemberLift! > 0);
  assert.ok(Math.abs(result.missingOne[0].bucket.winRate! - 0.5) < 1e-10);
});
test("frequent players have one vote per bucket and empty results are not zero win rates", () => {
  const repeat = group(["A"], 1).map((row) => ({ ...row, player: 1 }));
  const bucket = packageOutcomeBucket([...repeat, { ...repeat[0], player: 2, outcome: 0 }]);
  assert.equal(bucket.winRate, 0.5);
  assert.equal(bucket.players, 2);
  const result = compareWinRatePackage(repeat, ["A", "B"]);
  assert.equal(result.complete.winRate, null);
  assert.equal(result.lift, null);
  assert.equal(result.sufficient, false);
});
test("dates stay entirely on one side of the temporal split", () => {
  const rows = Array.from({ length: 10 }, (_, i) => ({ ...group([], 0.5)[0], eventId: i, eventDate: `2026-01-${String(i + 1).padStart(2, "0")}T10:00:00Z` }));
  rows.push({ ...rows[7], eventDate: "2026-01-08T20:00:00Z" });
  const split = splitPackageOutcomes(rows);
  assert.equal(split.discovery.length, 7);
  assert.equal(split.validation.length, 4);
  assert.equal(split.cutoff, "2026-01-08");
  assert.ok(split.discovery.every((r) => !split.validation.some((v) => v.eventId === r.eventId)));
});
test("discovers a three-card outcome package and rejects a ubiquitous passenger", () => {
  const rows: PackageOutcomeRow[] = [];
  for (let mask = 0; mask < 8; mask++) {
    rows.push(...group(["Staple", ...["A", "B", "C"].filter((_, i) => mask & (1 << i))], mask === 7 ? 0.9 : 0.4, mask * 20));
  }
  const result = discoverWinRatePackages(rows);
  assert.ok(result.findings.some((f) => f.cards.join("") === "ABC"));
  assert.ok(result.findings.every((f) => !f.cards.includes("Staple")));
});
test("a strong single card does not qualify an irrelevant second member", () => {
  const rows = [...group(["A", "B"], 0.8), ...group(["A"], 0.8, 20), ...group(["B"], 0.4, 40), ...group([], 0.4, 60)];
  assert.equal(discoverWinRatePackages(rows).findings.length, 0);
});
test("one prolific player or one event cannot satisfy support requirements", () => {
  const rows = [...group(["A", "B"], 0.9), ...group(["A"], 0.4, 20), ...group(["B"], 0.4, 40)];
  assert.equal(compareWinRatePackage(rows.map((r) => ({ ...r, player: 1 })), ["A", "B"]).sufficient, false);
  assert.equal(compareWinRatePackage(rows.map((r) => ({ ...r, eventId: 1 })), ["A", "B"]).sufficient, false);
});
test("four-card packages are reachable through the beam", () => {
  const rows: PackageOutcomeRow[] = [];
  for (let mask = 0; mask < 16; mask++) {
    rows.push(...group(["A", "B", "C", "D"].filter((_, i) => mask & (1 << i)), mask === 15 ? 0.95 : 0.3, mask * 20));
  }
  assert.ok(discoverWinRatePackages(rows).findings.some((f) => f.cards.join("") === "ABCD"));
});
test("a discovery winner can fail on later outcomes without changing its nomination", () => {
  const discovery = [...group(["A", "B"], 0.9), ...group(["A"], 0.4, 20), ...group(["B"], 0.4, 40)];
  const finding = discoverWinRatePackages(discovery).findings[0];
  assert.ok(finding);
  const later = discovery.map((row) => ({ ...row, outcome: row.cards.size === 2 ? 0.2 : 0.6 }));
  const check = compareWinRatePackage(later, finding.cards);
  assert.equal(check.sufficient, true);
  assert.ok(check.lift! < 0);
  assert.ok(check.weakestMemberLift! < 0);
  assert.ok(finding.discovery.lift! > 0);
});
