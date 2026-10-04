import { withDeckPrintings, extractDeckPrintings } from "@gatcg/shared";
import { useDeckEditFeedback } from "../../../components/deck-editor/useDeckEditFeedback";
import type { DeckFormat } from "@gatcg/shared";
import { useEffect, useRef, useState } from "react";
import type { Card } from "@gatcg/shared";
import { automaticDeckSection, editDeck, type DeckEdit, type EditableDeck } from "../../../lib/deckEditing";
import { selectionsToMaps, selectionCardName } from "../model/builderTypes";
import type { useBuilderWorkflowState } from "./useBuilderWorkflowState";

export function useBuilderEditing(workflow: ReturnType<typeof useBuilderWorkflowState>, catalog: Map<string, Card>, format: DeckFormat) {
  const { report, clear } = useDeckEditFeedback();
  useEffect(() => { clear(); }, [format, clear]);
  const { lockedCards, lockedSections, maybeboard } = workflow.state;
  let deck: EditableDeck = { main: [], material: [], sideboard: [], maybeboard: Array.from(maybeboard, ([card, quantity]) => ({ card, quantity })) };
  for (const [key, quantity] of lockedCards) {
    const name = selectionCardName(key);
    const section = lockedSections.get(key) ?? automaticDeckSection(catalog.get(name));
    deck[section].push({ card: name, quantity });
  }
  deck = withDeckPrintings(deck, workflow.state.printings ?? {});
  const [past, setPast] = useState<EditableDeck[]>([]);
  const [future, setFuture] = useState<EditableDeck[]>([]);
  const signature = JSON.stringify(deck);
  const activePrintings = JSON.stringify(extractDeckPrintings(deck));
  const storedPrintings = JSON.stringify(workflow.state.printings ?? {});
  const setPrintings = workflow.setPrintings;
  useEffect(() => { if (activePrintings !== storedPrintings) setPrintings(JSON.parse(activePrintings)); }, [activePrintings, storedPrintings, setPrintings]);
  const expected = useRef(signature);
  useEffect(() => {
    if (signature === expected.current) return;
    expected.current = signature;
    setPast([]); setFuture([]); clear();
  }, [signature, clear]);
  function apply(next: EditableDeck) {
    workflow.setPrintings(extractDeckPrintings(next));
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
    report(deck, next, action, catalog, format, () => {
      if (expected.current !== JSON.stringify(next)) throw new Error("The deck has changed. Use the editor’s Undo control.");
      setPast(history => history.slice(0, -1)); setFuture([next]); apply(deck);
    });
  }
  return { deck, edit, canUndo: past.length > 0, canRedo: future.length > 0,
    undo: () => { clear(); const previous = past.at(-1); if (!previous) return; setPast(past.slice(0, -1)); setFuture([deck, ...future]); apply(previous); },
    redo: () => { clear(); const next = future[0]; if (!next) return; setPast([...past, deck]); setFuture(future.slice(1)); apply(next); },
  };
}
