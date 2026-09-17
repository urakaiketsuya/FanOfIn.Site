import { useEffect, useMemo, useState } from "react";
import type { Card } from "@gatcg/shared";
import { matchesComboRequirement, printedKeywords, type ComboRequirementKind } from "../../lib/comboRequirements";

export interface ComboRecipeRequirement {
  kind: ComboRequirementKind;
  cards: string[];
  value: string;
  required: number;
  byTurn?: number | null;
  avoid?: {
    kind: ComboRequirementKind;
    cards: string[];
    value: string;
    maximum: number;
  } | null;
}

export interface RecipeGroup extends ComboRecipeRequirement { id: number }

export interface RecipePickerOption {
  kind: ComboRequirementKind;
  value: string;
  label: string;
  group: "Cards" | "Types and subtypes" | "Keywords";
  copies: number;
}

export function useComboRecipe({ mainLines, catalogByName, initialRecipe, onRecipeChange }: {
  mainLines: { name: string; quantity: number }[];
  catalogByName: Map<string, Card>;
  initialRecipe?: ComboRecipeRequirement[];
  onRecipeChange?: (requirements: ComboRecipeRequirement[]) => void;
}) {
  const [groups, setGroups] = useState<RecipeGroup[]>(() => {
    const seed = initialRecipe?.length ? initialRecipe : [
      { kind: "cards" as const, cards: [], value: "", required: 1 },
      { kind: "cards" as const, cards: [], value: "", required: 1 },
    ];
    return seed.map((group, index) => ({ ...group, id: index + 1 }));
  });
  const [nextGroupId, setNextGroupId] = useState((initialRecipe?.length ?? 2) + 1);

  useEffect(() => {
    onRecipeChange?.(groups.map(({ kind, cards, value, required, byTurn, avoid }) => ({ kind, cards, value, required, byTurn: byTurn ?? null, avoid: avoid ?? null })));
  }, [groups, onRecipeChange]);

  const options = useMemo<RecipePickerOption[]>(() => {
    const attributes = new Map<string, string>();
    const keywords = new Set<string>();
    for (const line of mainLines) {
      const card = catalogByName.get(line.name);
      for (const type of card?.types ?? []) attributes.set(`type:${type}`, `Type · ${type}`);
      for (const subtype of card?.subtypes ?? []) attributes.set(`subtype:${subtype}`, `Subtype · ${subtype}`);
      if (card) for (const keyword of printedKeywords(card)) keywords.add(keyword);
    }
    const countMatches = (requirement: Pick<ComboRecipeRequirement, "kind" | "cards" | "value">) => mainLines.reduce((sum, line) => {
      const card = catalogByName.get(line.name);
      return card && matchesComboRequirement(card, requirement) ? sum + line.quantity : sum;
    }, 0);
    return [
      ...mainLines.map((line) => ({ kind: "cards" as const, value: line.name, label: line.name, group: "Cards" as const, copies: line.quantity })),
      ...[...attributes].sort((a, b) => a[1].localeCompare(b[1])).map(([value, label]) => ({ kind: "attribute" as const, value, label: label.replace("Subtype · ", "Any ").replace("Type · ", "Any "), group: "Types and subtypes" as const, copies: countMatches({ kind: "attribute", cards: [], value }) })),
      ...[...keywords].sort().map((value) => ({ kind: "keyword" as const, value, label: `Keyword · ${value}`, group: "Keywords" as const, copies: countMatches({ kind: "keyword", cards: [], value }) })),
    ];
  }, [mainLines, catalogByName]);

  const matches = useMemo(() => groups.map((group) => mainLines.filter((line) => {
    const card = catalogByName.get(line.name);
    return card ? matchesComboRequirement(card, group) : false;
  })), [groups, mainLines, catalogByName]);
  const avoidMatches = useMemo(() => groups.map((group) => group.avoid ? mainLines.filter((line) => {
    const card = catalogByName.get(line.name);
    return card ? matchesComboRequirement(card, group.avoid!) : false;
  }) : []), [groups, mainLines, catalogByName]);
  const overlappingCards = useMemo(() => {
    const counts = new Map<string, number>();
    for (const lines of [...matches, ...avoidMatches]) for (const line of lines) counts.set(line.name, (counts.get(line.name) ?? 0) + 1);
    return [...counts].filter(([, count]) => count > 1).map(([name]) => name);
  }, [matches, avoidMatches]);

  const addSelection = (groupId: number, option: RecipePickerOption) => setGroups((current) => current.map((group) => {
    if (group.id !== groupId) return group;
    if (option.kind === "cards") {
      const cards = group.kind === "cards" ? group.cards : [];
      return { ...group, kind: "cards", value: "", cards: cards.includes(option.value) ? cards : [...cards, option.value] };
    }
    return { ...group, kind: option.kind, value: option.value, cards: [] };
  }));
  const clearSelection = (groupId: number) => setGroups((current) => current.map((group) => group.id === groupId ? { ...group, kind: "cards", cards: [], value: "" } : group));
  const removeCard = (groupId: number, cardName: string) => setGroups((current) => current.map((group) => group.id !== groupId || group.kind !== "cards" ? group : { ...group, cards: group.cards.filter((name) => name !== cardName) }));
  const removeAvoidCard = (groupId: number, cardName: string) => setGroups((current) => current.map((group) => {
    if (group.id !== groupId || group.avoid?.kind !== "cards") return group;
    const cards = group.avoid.cards.filter((name) => name !== cardName);
    return { ...group, avoid: cards.length ? { ...group.avoid, cards } : null };
  }));
  const toggleAvoided = (groupId: number, value: string, avoided: boolean) => setGroups((current) => current.map((group) => {
    if (group.id !== groupId) return group;
    if (avoided) {
      if (group.kind === "cards") {
        const avoidCards = group.avoid?.kind === "cards" ? group.avoid.cards : [];
        return { ...group, cards: group.cards.filter((name) => name !== value), avoid: { kind: "cards", cards: avoidCards.includes(value) ? avoidCards : [...avoidCards, value], value: "", maximum: group.avoid?.maximum ?? 0 } };
      }
      return { ...group, kind: "cards", cards: [], value: "", avoid: { kind: group.kind, cards: [], value: group.value, maximum: group.avoid?.maximum ?? 0 } };
    }
    if (!group.avoid) return group;
    if (group.avoid.kind === "cards") {
      const remaining = group.avoid.cards.filter((name) => name !== value);
      const wantedCards = group.kind === "cards" ? group.cards : [];
      return { ...group, kind: "cards", cards: wantedCards.includes(value) ? wantedCards : [...wantedCards, value], value: "", avoid: remaining.length ? { ...group.avoid, cards: remaining } : null };
    }
    return { ...group, kind: group.avoid.kind, cards: [], value: group.avoid.value, avoid: null };
  }));
  const addGroup = () => {
    const id = nextGroupId;
    setGroups((current) => [...current, { id, kind: "cards", cards: [], value: "", required: 1, byTurn: null }]);
    setNextGroupId((value) => value + 1);
    return id;
  };

  return { groups, setGroups, options, matches, avoidMatches, overlappingCards, addSelection, clearSelection, removeCard, removeAvoidCard, toggleAvoided, addGroup };
}
