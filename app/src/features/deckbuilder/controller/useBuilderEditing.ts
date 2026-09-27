import { useEffect, useRef, useState } from "react";
import type { Card } from "@gatcg/shared";
import { automaticDeckSection, editDeck, type DeckEdit, type EditableDeck } from "../../../lib/deckEditing";
import { selectionsToMaps, selectionCardName } from "../model/builderTypes";
import type { useBuilderWorkflowState } from "./useBuilderWorkflowState";

export function useBuilderEditing(workflow: ReturnType<typeof useBuilderWorkflowState>, catalog: Map<string, Card>) {
  const { lockedCards, lockedSections, maybeboard } = workflow.state;
  const deck: EditableDeck = { main: [], material: [], sideboard: [], maybeboard: Array.from(maybeboard, ([card, quantity]) => ({ card, quantity })) };
  for (const [key, quantity] of lockedCards) {
    const name = selectionCardName(key);
    const section = lockedSections.get(key) ?? automaticDeckSection(catalog.get(name));
    deck[section].push({ card: name, quantity });
  }
  const [past, setPast] = useState<EditableDeck[]>([]);
  const [future, setFuture] = useState<EditableDeck[]>([]);
  const [notice, setNotice] = useState("");
  const signature = JSON.stringify(deck);
  const expected = useRef(signature);
  useEffect(() => {
    if (signature === expected.current) return;
    expected.current = signature;
    setPast([]); setFuture([]); setNotice("");
  }, [signature]);
  function apply(next: EditableDeck) {
    expected.current = JSON.stringify(next);
    const maps = selectionsToMaps((["main", "material", "sideboard"] as const).flatMap((section) => next[section].map((line) => ({ name: line.card, quantity: line.quantity, section }))));
    workflow.setLockedCards(maps.cards);
    workflow.setLockedSections(maps.sections);
    workflow.setMaybeboard(new Map(next.maybeboard.map((line) => [line.card, line.quantity])));
    const identities = next.material.map((line) => catalog.get(line.card)).filter((card) => card?.types.includes("CHAMPION"));
    workflow.setSpiritFilter(identities.find((card) => card?.subtypes.includes("SPIRIT"))?.name ?? null);
    workflow.setChampionName(identities.find((card) => !card?.subtypes.includes("SPIRIT"))?.name.split(",")[0].trim() ?? null);
  }
  function edit(action: DeckEdit) {
    const next = editDeck(deck, action, catalog);
    if (next === deck) return;
    setPast((history) => [...history.slice(-49), deck]); setFuture([]); apply(next);
    setNotice(action.type === "add-many" ? `Added ${action.additions.length} selected cards. Undo is available.` : `${action.type === "remove" ? "Removed" : action.type === "move" ? "Moved" : "Updated"} ${action.name}.`);
  }
  return { deck, edit, notice, canUndo: past.length > 0, canRedo: future.length > 0,
    undo: () => { const previous = past.at(-1); if (!previous) return; setPast(past.slice(0, -1)); setFuture([deck, ...future]); apply(previous); setNotice("Edit undone."); },
    redo: () => { const next = future[0]; if (!next) return; setPast([...past, deck]); setFuture(future.slice(1)); apply(next); setNotice("Edit redone."); },
  };
}
