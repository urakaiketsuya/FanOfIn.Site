import type { ClusterMatchupImpact } from "@gatcg/shared";

export interface MatchupSideboardRecommendation {
  cardName: string;
  score: number;
  helpfulLift: number;
  answers: { opponentCardName: string; mitigation: number; scope: "cluster" | "champion" }[];
}

/**
 * Restricts published matchup evidence to cards the viewer can actually board in. `score` is the
 * strongest observed signal, not a sum: helpful-card lift and answer mitigation come from
 * overlapping game populations and must not be treated as independent gains.
 */
export function matchupSideboardRecommendations(
  matchup: ClusterMatchupImpact,
  sideboardNames: ReadonlySet<string>,
): MatchupSideboardRecommendation[] {
  const helpfulByName = new Map(matchup.myCards.map((entry) => [entry.cardName, Math.max(0, entry.adjustedLift)]));
  const answersByName = new Map<string, MatchupSideboardRecommendation["answers"]>();
  for (const group of matchup.answers ?? []) {
    for (const answer of group.answers) {
      if (answer.mitigation <= 0) continue;
      const entries = answersByName.get(answer.cardName) ?? [];
      entries.push({ opponentCardName: group.opponentCardName, mitigation: answer.mitigation, scope: answer.scope });
      answersByName.set(answer.cardName, entries);
    }
  }

  return [...sideboardNames].flatMap((cardName) => {
    const helpfulLift = helpfulByName.get(cardName) ?? 0;
    const answers = (answersByName.get(cardName) ?? []).sort((a, b) => b.mitigation - a.mitigation);
    const score = Math.max(helpfulLift, answers[0]?.mitigation ?? 0);
    return score > 0 ? [{ cardName, score, helpfulLift, answers }] : [];
  }).sort((a, b) => b.score - a.score || a.cardName.localeCompare(b.cardName));
}

/** Prefer a high-quantity card with no positive matchup evidence as the preview's provisional cut. */
export function suggestedMatchupCut(
  mainLines: { name: string; quantity: number }[],
  matchup: ClusterMatchupImpact,
  incomingName: string,
): string {
  const helpful = new Map(matchup.myCards.map((entry) => [entry.cardName, Math.max(0, entry.adjustedLift)]));
  return [...mainLines]
    .filter((line) => line.name !== incomingName)
    .sort((a, b) => (helpful.get(a.name) ?? 0) - (helpful.get(b.name) ?? 0) || b.quantity - a.quantity || a.name.localeCompare(b.name))[0]?.name ?? "";
}
