import type { ArchetypeCluster } from "@gatcg/shared";
export interface LocalArchetype {
  id: string; name: string; namingCards: string[]; description: string; buildIds: string[];
  packageIds: string[]; status: "review" | "curated" | "hidden"; snapshots: Record<string, string>;
}
export interface ArchetypeStore { version: 1; entries: LocalArchetype[]; drafts: LocalArchetype[]; undo?: LocalArchetype[] }
export const key = "fan-of-insight-archetypes-v1";
export const emptyStore = (): ArchetypeStore => ({ version: 1, entries: [], drafts: [] });
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(x => typeof x === "string");
export function parseStore(raw: string): ArchetypeStore {
  const value = JSON.parse(raw);
  const valid = (items: unknown) => Array.isArray(items) && items.every(x => x && typeof x.id === "string" && typeof x.name === "string" && typeof x.description === "string" && strings(x.namingCards) && strings(x.buildIds) && strings(x.packageIds) && ["review", "curated", "hidden"].includes(x.status) && x.snapshots && typeof x.snapshots === "object" && Object.values(x.snapshots).every(v => typeof v === "string")) && new Set(items.map(x => x.id)).size === items.length;
  if (value.version !== 1 || !valid(value.entries) || !valid(value.drafts) || (value.undo !== undefined && !valid(value.undo))) throw new Error("Invalid archetype backup. Existing data was left untouched.");
  return value;
}
export const fingerprint = (build: ArchetypeCluster) => JSON.stringify([build.name, build.namingCards, build.deckIds]);
export function fromBuild(build: ArchetypeCluster): LocalArchetype {
  return { id: build.id, name: build.name, namingCards: build.namingCards ?? build.definingCards.slice(0, 3).map(c => c.name), description: "", buildIds: [build.id], packageIds: [], status: "review", snapshots: { [build.id]: fingerprint(build) } };
}
export function needsReview(entry: LocalArchetype, builds: ArchetypeCluster[]) {
  return entry.buildIds.some(id => { const build = builds.find(b => b.id === id); return !build || entry.snapshots[id] !== fingerprint(build); });
}
