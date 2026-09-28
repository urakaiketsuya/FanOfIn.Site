import { shortHash, type ArchetypeCluster, type EngineArchetype } from "@gatcg/shared";

export interface EngineDeck {
  deckId: string; player: number; eventId: number; championName: string;
  format: string; access: string; materialRouteName: string; cardCounts: Map<string, number>;
}
type EvidenceCard = { name: string; prevalence: number; enrichment: number };
const rank = (a: EvidenceCard, b: EvidenceCard) => b.enrichment - a.enrichment || b.prevalence - a.prevalence || a.name.localeCompare(b.name);
function presence(decks: EngineDeck[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const deck of decks) for (const name of deck.cardCounts.keys()) result.set(name, (result.get(name) ?? 0) + 1 / decks.length);
  return result;
}
/** Additive relationship analysis. Never changes cluster membership, ids, or statistical fields. */
export function analyzeEngines(builds: ArchetypeCluster[], decks: EngineDeck[]): EngineArchetype[] {
  const byId = new Map(decks.map((deck) => [deck.deckId, deck]));
  const rows = new Map(builds.map((build) => [build.id, build.deckIds.flatMap((id) => byId.has(id) ? [byId.get(id)!] : [])]));
  const cards = new Map<string, EvidenceCard[]>();
  for (const build of builds) {
    const own = rows.get(build.id)!;
    const keys = new Set(own.map((d) => `${d.format}:${d.access}`));
    const compatible = decks.filter((d) => keys.has(`${d.format}:${d.access}`));
    const routes = new Set(own.map((d) => d.materialRouteName));
    const routed = compatible.filter((d) => routes.has(d.materialRouteName));
    // Use the route only when it contains independent comparison builds.
    const ownIds = new Set(build.deckIds);
    const cohort = routed.filter((d) => !ownIds.has(d.deckId)).length >= 10 ? routed : compatible;
    const baseline = presence(cohort);
    cards.set(build.id, [...presence(own)].map(([name, prevalence]) => ({ name, prevalence, enrichment: Math.max(0, prevalence - (baseline.get(name) ?? 0)) })).sort(rank));
  }
  const similarity = (a: EvidenceCard[], b: EvidenceCard[]) => {
    const right = new Map(b.map((c) => [c.name, c]));
    let shared = 0, union = 0;
    for (const c of a) { const r = right.get(c.name); shared += Math.min(c.enrichment, r?.enrichment ?? 0); union += Math.max(c.enrichment, r?.enrichment ?? 0); right.delete(c.name); }
    for (const c of right.values()) union += c.enrichment;
    return union ? shared / union : 0;
  };
  const labelCards = new Map<string, EvidenceCard[]>();
  // Labels compare full observed card pools to the nearest same-Champion sibling.
  for (const build of builds) {
    const own = cards.get(build.id)!;
    const sibling = builds.filter((b) => b.id !== build.id && b.championName === build.championName)
      .sort((a, b) => similarity(own, cards.get(b.id)!) - similarity(own, cards.get(a.id)!) || a.id.localeCompare(b.id))[0];
    const other = new Map((sibling ? cards.get(sibling.id)! : []).map((c) => [c.name, c.prevalence]));
    const distinguishing = own.filter((c) => c.prevalence >= .5).sort((a, b) => (b.prevalence - (other.get(b.name) ?? 0)) - (a.prevalence - (other.get(a.name) ?? 0)) || rank(a, b));
    labelCards.set(build.id, distinguishing);
    build.name = `${build.championName} — ${distinguishing.slice(0, 2).map((c) => c.name).join(" / ") || "Recurring build"}`;
  }
  const duplicateNames = new Set(builds.filter((build) => builds.filter((other) => other.name === build.name).length > 1).map((build) => build.name));
  for (const name of duplicateNames) {
    const duplicates = builds.filter((build) => build.name === name).sort((a, b) => a.id.localeCompare(b.id));
    for (const build of duplicates) {
      const extra = labelCards.get(build.id)?.[2]?.name;
      build.name += extra ? ` / ${extra}` : "";
    }
    for (const build of duplicates) {
      const same = duplicates.filter((other) => other.name === build.name);
      if (same.length > 1) for (const [index, other] of same.entries()) other.name += ` — variant ${index + 1}`;
    }
  }
  const groups: ArchetypeCluster[][] = [];
  for (const build of [...builds].sort((a, b) => b.playerCount - a.playerCount || a.id.localeCompare(b.id))) {
    const own = cards.get(build.id)!.filter((c) => c.prevalence >= .75);
    const group = groups.map((g) => ({ g, score: similarity(own, cards.get(g[0].id)!.filter((c) => c.prevalence >= .75)) }))
      .filter(({ score }) => score >= .3).sort((a, b) => b.score - a.score || a.g[0].id.localeCompare(b.g[0].id))[0]?.g;
    if (group) group.push(build); else groups.push([build]);
  }
  const result = groups.map((group): EngineArchetype => {
    const buildIds = group.map((b) => b.id).sort();
    const population = [...new Map(group.flatMap((b) => rows.get(b.id)!).map((d) => [d.deckId, d])).values()];
    const champions = [...new Set(population.map((d) => d.championName))].sort();
    const presenceByChampion = new Map(champions.map((champion) => [champion, presence(population.filter((deck) => deck.championName === champion))]));
    const championEvidence = champions.map((championName) => {
      const own = population.filter((d) => d.championName === championName);
      const others = presence(population.filter((d) => d.championName !== championName));
      const playerCount = new Set(own.map((d) => d.player)).size, eventCount = new Set(own.map((d) => d.eventId)).size;
      return { championName, deckCount: own.length, playerCount, eventCount, qualifying: playerCount >= 3 && eventCount >= 2,
        differentiatorCards: [...presence(own)].map(([name, prevalence]) => ({ name, prevalence, enrichment: prevalence - (others.get(name) ?? 0) })).filter((c) => c.prevalence >= .5 && c.enrichment >= .25).sort(rank).slice(0, 8) };
    });
    const commonCore = [...presence(population)].map(([name, prevalence]) => ({ name, prevalence, enrichment: Math.min(...group.map((b) => cards.get(b.id)!.find((c) => c.name === name)?.enrichment ?? 0)) }))
      .filter((c) => c.prevalence >= .75 && champions.every((champ) => (presenceByChampion.get(champ)!.get(c.name) ?? 0) >= .75)).sort(rank);
    const recurring = commonCore.filter((c) => c.enrichment >= .15 && championEvidence.filter((e) => e.qualifying).every((e) => {
      const supporting = population.filter((d) => d.championName === e.championName && d.cardCounts.has(c.name));
      return new Set(supporting.map((d) => d.player)).size >= 3 && new Set(supporting.map((d) => d.eventId)).size >= 2;
    }));
    const status = champions.length < 2 ? "champion-specific" : championEvidence.filter((e) => e.qualifying).length >= 2 && recurring.length >= 2 ? "shared" : "candidate";
    const id = shortHash(`engine:${buildIds.join("|")}`);
    return { id, name: recurring.length >= 2 ? `${recurring.slice(0, 2).map((c) => c.name).join(" / ")} package` : `${group[0].name} overlap`, seedBuildId: group[0].id, buildIds,
      status, commonCore, championEvidence, championBreakdown: championEvidence, definingCards: recurring,
      deckCount: population.length, playerCount: new Set(population.map((d) => d.player)).size, eventCount: new Set(population.map((d) => d.eventId)).size,
      avgWinRate: group.reduce((sum, b) => sum + b.avgWinRate * b.deckCount, 0) / Math.max(1, population.length), confidence: status === "shared" ? "established" : "emerging" };
  });
  const duplicateEngines = new Set(result.filter((engine) => result.filter((other) => other.name === engine.name).length > 1).map((engine) => engine.name));
  for (const engine of result) if (duplicateEngines.has(engine.name)) engine.name += ` (${engine.id})`;
  return result.sort((a, b) => b.playerCount - a.playerCount || a.id.localeCompare(b.id));
}
