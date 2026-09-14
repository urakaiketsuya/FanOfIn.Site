import { useEffect, useRef, useState } from "react";
import type { Card } from "@gatcg/shared";
import { useSearchParams } from "react-router-dom";
import { accountApi, AccountApiError } from "../../../lib/accountApi";
import { decklistToWorkspace } from "./deckWorkspaceImport";
import type { DeckWorkspace } from "./deckWorkspace";

type WorkspaceSource = Extract<DeckWorkspace["source"], "analysis" | "review" | "combo">;

export interface RequestedDeckState {
  pending: boolean;
  error: string | null;
  retry: () => void;
}

/** Loads a specifically linked saved or public deck before replacing the active workspace. */
export function useRequestedDeckWorkspace(
  catalogByName: Map<string, Card>,
  source: WorkspaceSource,
  onLoad: (workspace: Omit<DeckWorkspace, "version" | "updatedAt">) => void,
): RequestedDeckState {
  const [searchParams, setSearchParams] = useSearchParams();
  const savedDeckId = searchParams.get("deck");
  const publicDeckSlug = savedDeckId ? null : searchParams.get("publicDeck");
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(Boolean(savedDeckId || publicDeckSlug));
  const [error, setError] = useState<string | null>(null);
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  useEffect(() => {
    const parameter = savedDeckId ? "deck" : publicDeckSlug ? "publicDeck" : null;
    const identifier = savedDeckId ?? publicDeckSlug;
    if (!parameter || !identifier) { setPending(false); setError(null); return; }
    if (catalogByName.size === 0) { setPending(true); return; }

    let active = true;
    setPending(true);
    setError(null);
    const request = savedDeckId
      ? accountApi.deck(savedDeckId).then(({ deck }) => ({ deck, sourceLabel: "My Decks" }))
      : accountApi.publicDeck(publicDeckSlug!).then(({ deck }) => ({ deck, sourceLabel: `Community · ${deck.owner.displayName}` }));
    void request.then(({ deck, sourceLabel }) => {
      if (!active) return;
      const workspace = decklistToWorkspace(
        deck.decklist,
        catalogByName,
        source,
        deck.format,
        deck.championName,
        deck.title,
        sourceLabel,
      );
      if ("maybeboard" in deck) workspace.maybeboard = deck.maybeboard.map(({ card: name, quantity }) => ({ name, quantity }));
      onLoadRef.current(workspace);
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.delete(parameter);
        return next;
      }, { replace: true });
      setPending(false);
    }).catch((reason: unknown) => {
      if (!active) return;
      const message = reason instanceof AccountApiError && reason.status === 401
        ? "Sign in to open this saved deck."
        : reason instanceof AccountApiError && reason.status === 404
          ? "That deck is no longer available."
          : reason instanceof Error ? reason.message : "The deck could not be loaded.";
      setError(message);
      setPending(false);
    });
    return () => { active = false; };
  }, [attempt, catalogByName, publicDeckSlug, savedDeckId, setSearchParams, source]);

  return { pending, error, retry: () => setAttempt((value) => value + 1) };
}
