import { computeSingleCardImpact, type CardImpactEntry, type CardSectionRow } from "@gatcg/shared";
import { weightedJaccard } from "../../lib/decodedDecks";

const PRIOR_WEIGHT = 10;
const MIN_SAMPLE_SIZE = 5;
const MIN_PEERS = MIN_SAMPLE_SIZE * 2;
const PEER_LIMIT = 50;
const MIN_SIMILARITY = 0.3;
const REMOVAL_LIFT_CEILING = -0.02;

export interface ContextualMaterialRow {
  main: Map<string, number>;
  material: Map<string, number>;
  sideboard: Map<string, number>;
  winRate: number;
}

export interface ContextualMaterialReplacement {
  cardName: string;
  peerDecks: number;
}

/**
 * A Material card is only safe to surface as a cut when nearby decks reproduce both sides of the
 * claim: the current card remains meaningfully negative and a visible Material alternative is
 * positive in that same cohort. Removing the candidate from the target before neighbor matching
 * prevents the card being evaluated from selecting its own comparison group.
 */
export function findContextualMaterialReplacement(
  candidateName: string,
  assembledIdentity: Map<string, number>,
  rows: ContextualMaterialRow[],
  alternativeNames: string[],
): ContextualMaterialReplacement | undefined {
  const target = new Map(assembledIdentity);
  target.delete(candidateName);
  const peers = rows
    .map((row) => ({ row, similarity: weightedJaccard(target, new Map([...row.main, ...row.material])) }))
    .filter((peer) => peer.similarity >= MIN_SIMILARITY)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, PEER_LIMIT)
    .map((peer) => peer.row);
  if (peers.length < MIN_PEERS) return undefined;

  const peerSectionRows: CardSectionRow[] = peers.map((row) => ({
    sections: { main: new Set(row.main.keys()), material: new Set(row.material.keys()), sideboard: new Set(row.sideboard.keys()) },
    outcome: row.winRate,
  }));
  const peerBaseline = peers.reduce((sum, row) => sum + row.winRate, 0) / peers.length;
  const candidateImpact = computeSingleCardImpact(peerSectionRows, candidateName, peerBaseline, PRIOR_WEIGHT, MIN_SAMPLE_SIZE);
  if (!candidateImpact || candidateImpact.adjustedLift > REMOVAL_LIFT_CEILING) return undefined;

  const replacement = alternativeNames
    .map((cardName) => ({ cardName, impact: computeSingleCardImpact(peerSectionRows, cardName, peerBaseline, PRIOR_WEIGHT, MIN_SAMPLE_SIZE) }))
    .filter((entry): entry is { cardName: string; impact: CardImpactEntry } => !!entry.impact && entry.impact.adjustedLift > 0)
    .sort((a, b) => b.impact.adjustedLift - a.impact.adjustedLift)[0];
  return replacement ? { cardName: replacement.cardName, peerDecks: peers.length } : undefined;
}
