import { probabilityOfTimedRecipe } from "./comboOdds";
import { naturalCardsSeenByTurn, type PlayOrder } from "./turnToPlay";

export interface ResilienceInput { establishCopies: number; establishRequired: number; protectionCopies: number; protectionRequired: number; rebuildCopies: number; rebuildRequired: number }
export interface ResilienceResult {
  establishProbability: number; protectedProbability: number; rebuildProbability: number;
  resilientProbability: number; exposedProbability: number;
  bestAdditionalCopy: { role: "establish" | "protection" | "rebuild"; gain: number } | null;
}

export function computeResilienceForecast(deckSize: number, startingHandSize: number, input: ResilienceInput, clearTurn: number, recoveryTurn: number, playOrder: PlayOrder): ResilienceResult {
  const groups = {
    establish: { copies: Math.max(0, input.establishCopies), required: Math.max(1, input.establishRequired), seen: Math.min(deckSize, naturalCardsSeenByTurn(clearTurn, startingHandSize, playOrder)) },
    protection: { copies: Math.max(0, input.protectionCopies), required: Math.max(1, input.protectionRequired), seen: Math.min(deckSize, naturalCardsSeenByTurn(clearTurn, startingHandSize, playOrder)) },
    rebuild: { copies: Math.max(0, input.rebuildCopies), required: Math.max(1, input.rebuildRequired), seen: Math.min(deckSize, naturalCardsSeenByTurn(Math.max(clearTurn, recoveryTurn), startingHandSize, playOrder)) },
  };
  const odds = (selected: (keyof typeof groups)[], change?: { role: keyof typeof groups; copies: number }) => probabilityOfTimedRecipe(deckSize, selected.map((role) => ({ ...groups[role], copies: change?.role === role ? change.copies : groups[role].copies })));
  const establishProbability = odds(["establish"]);
  const protectedProbability = odds(["establish", "protection"]);
  const rebuildProbability = odds(["establish", "rebuild"]);
  const allThree = odds(["establish", "protection", "rebuild"]);
  const resilientProbability = Math.max(0, Math.min(1, protectedProbability + rebuildProbability - allThree));
  const gains = (["establish", "protection", "rebuild"] as const).map((role) => {
    const changed = { role, copies: groups[role].copies + 1 };
    const protectedRoute = odds(["establish", "protection"], changed);
    const rebuilt = odds(["establish", "rebuild"], changed);
    const both = odds(["establish", "protection", "rebuild"], changed);
    return { role, gain: Math.max(0, protectedRoute + rebuilt - both - resilientProbability) };
  }).sort((a, b) => b.gain - a.gain);
  return { establishProbability, protectedProbability, rebuildProbability, resilientProbability, exposedProbability: Math.max(0, establishProbability - resilientProbability), bestAdditionalCopy: gains[0].gain > 0 ? gains[0] : null };
}
