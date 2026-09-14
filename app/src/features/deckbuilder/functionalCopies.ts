import type { Card } from "@gatcg/shared";
import { fixedChampionDamageRange } from "../../lib/deckIdentity";
import { drawnCardsPerCopy } from "./drawEffects";

export type FunctionalRole = "draw" | "interaction" | "floating" | "reach";

export const FUNCTIONAL_ROLE_LABELS: Record<FunctionalRole, string> = {
  draw: "Card draw",
  interaction: "Interaction",
  floating: "Floating Memory",
  reach: "Champion reach",
};

const INTERACTION_RE = /\b(?:destroy|banish|negate|rest|return)\b[^.]{0,80}\b(?:target|opponent|unit|ally|weapon|item|attack|card)\b|\b(?:intercept|taunt)\b/i;

/** Conservative, text-derived roles whose members can be treated as functional alternatives. */
export function functionalRoles(card: Card): FunctionalRole[] {
  const roles: FunctionalRole[] = [];
  const effect = card.effect ?? "";
  if (drawnCardsPerCopy(card) > 0 && !(card.types.includes("CHAMPION") && card.level === 0)) roles.push("draw");
  if (INTERACTION_RE.test(effect.replace(/\*\*/g, ""))) roles.push("interaction");
  if (/\*\*Floating Memory\*\*/i.test(effect)) roles.push("floating");
  if (fixedChampionDamageRange(card)) roles.push("reach");
  return roles;
}

export function functionalRoleLines(
  lines: { name: string; quantity: number }[],
  cardsByName: ReadonlyMap<string, Card>,
  role: FunctionalRole,
): { name: string; quantity: number }[] {
  return lines.filter((line) => {
    const card = cardsByName.get(line.name);
    return card ? functionalRoles(card).includes(role) : false;
  });
}
