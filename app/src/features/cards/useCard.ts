import { useEffect, useState } from "react";
import type { Card } from "@gatcg/shared";
import { db } from "../../lib/db";
import { gatcgApi } from "../../lib/api/client";

interface CardState {
  card: Card | undefined;
  loading: boolean;
  error: string | null;
}

/** Local cache first (instant, offline-capable); falls back to the network for cards the sync hasn't reached yet. */
export function useCard(slug: string): CardState {
  const [state, setState] = useState<CardState>({ card: undefined, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ card: undefined, loading: true, error: null });

    (async () => {
      const cached = await db.cards.where("slug").equals(slug).first();
      if (cancelled) return;
      if (cached) {
        setState({ card: cached, loading: false, error: null });
        return;
      }
      try {
        const fetched = await gatcgApi.getCard(slug);
        if (!cancelled) setState({ card: fetched, loading: false, error: null });
      } catch (err) {
        console.error(`failed to load card "${slug}"`, err);
        const notFound = typeof err === "object" && err !== null && "status" in err && err.status === 404;
        if (!cancelled) setState({ card: undefined, loading: false, error: notFound ? null : "We couldn't load this card. Check your connection and try again." });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return state;
}
