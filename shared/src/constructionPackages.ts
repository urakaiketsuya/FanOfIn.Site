/** Independent construction-discovery report; never an approval or recommendation input. */
export interface ConstructionMember { name: string; section: "main" | "material" }
export interface ConstructionSupport { decks: number; players: number; events: number; lists: number }
export interface ConstructionCandidate {
  id: string;
  source: "within-build-construction-v1";
  buildId: string; build: string; champion: string; format: string; season: string;
  cards: string[]; core: ConstructionMember[];
  options: { member: ConstructionMember; withCore: number; withoutCore: number }[];
  discovery: { population: number; complete: ConstructionSupport; absent: ConstructionSupport; partial: number; weakestAssociation: number };
  validation: { starts: string; population: number; complete: ConstructionSupport; absent: ConstructionSupport; newPlayers: number; status: "repeated" | "not-repeated" | "insufficient-data" };
  quantities: { member: ConstructionMember; min: number; median: number; max: number }[];
  slots: { main: number; material: number };
  examples: { withId: string; withoutId: string; similarity: number; added: { member: ConstructionMember; quantity: number }[]; removed: { member: ConstructionMember; quantity: number }[] }[];
  mechanics: { name: string; text: string }[];
  bannedCards: string[];
  definingOverlap: string[];
  questions: string[];
}
export interface ConstructionReport {
  method: "within-build-construction-v1"; generatedAt: string;
  sources: { decks: string; sightings: string; taxonomy: string; catalog: string };
  cohortsTested: number; nominated: number; settings: Record<string, number>;
  candidates: ConstructionCandidate[];
}
