import { useEffect, useState } from "react";
import type { Card } from "@gatcg/shared";
import { db } from "../../lib/db";

const MAX_ATTEMPTS = 15;

/** Picks one random locally-synced card with non-empty flavor text, via random offset probes rather than loading the whole catalog. */
export function useRandomFlavorCard(): Card | undefined {
  const [card, setCard] = useState<Card | undefined>();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const total = await db.cards.count();
      if (total === 0) return;

      for (let attempt = 0; attempt < MAX_ATTEMPTS && !cancelled; attempt++) {
        const offset = Math.floor(Math.random() * total);
        const candidate = await db.cards.offset(offset).first();
        if (candidate?.flavor && candidate.flavor.trim().length > 0) {
          if (!cancelled) setCard(candidate);
          return;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return card;
}
