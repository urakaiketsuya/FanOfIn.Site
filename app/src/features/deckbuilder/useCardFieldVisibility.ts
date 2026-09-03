import { useCallback, useState } from "react";

const CARD_FIELDS_STORAGE_KEY = "deckbuilder-card-fields-v1";

export interface CardFieldVisibility {
  cost: boolean;
  price: boolean;
  winRate: boolean;
  sample: boolean;
  community: boolean;
  /** Grid view only (BuilderCardGrid) — CardRow/SuggestionRow's list layout has no rendering for these yet. */
  priceTrend: boolean;
  quantityNote: boolean;
  hypeGap: boolean;
  metaTrend: boolean;
  simulatorDetail: boolean;
  tags: boolean;
}

const DEFAULT_VISIBILITY: CardFieldVisibility = {
  cost: true,
  price: false,
  winRate: true,
  sample: false,
  community: false,
  priceTrend: false,
  quantityNote: false,
  hypeGap: false,
  metaTrend: false,
  simulatorDetail: false,
  tags: false,
};

function loadVisibility(): CardFieldVisibility {
  try {
    const raw = localStorage.getItem(CARD_FIELDS_STORAGE_KEY);
    if (!raw) return DEFAULT_VISIBILITY;
    return { ...DEFAULT_VISIBILITY, ...(JSON.parse(raw) as Partial<CardFieldVisibility>) };
  } catch {
    return DEFAULT_VISIBILITY;
  }
}

function saveVisibility(visibility: CardFieldVisibility): void {
  try {
    localStorage.setItem(CARD_FIELDS_STORAGE_KEY, JSON.stringify(visibility));
  } catch {
    // Private-browsing/storage-full edge cases can throw here — losing the saved preference
    // silently is strictly better than crashing the page over it.
  }
}

/**
 * Which per-card data fields show on CardRow/SuggestionRow/BuilderCardGrid across the whole
 * Guided Deck Builder — a durable cross-session display preference (`localStorage`, not scoped to
 * a tab or a deck-builder session like `deckbuilder-session-v1`), since "always show me X" is a
 * standing preference, not in-progress deck state. Defaults to a minimal set (Cost + Win rate) so
 * card rows stay scannable; the rest are opt-in via the Customize panel.
 */
export function useCardFieldVisibility(): [CardFieldVisibility, (field: keyof CardFieldVisibility, value: boolean) => void] {
  const [visibility, setVisibility] = useState<CardFieldVisibility>(loadVisibility);

  const setField = useCallback((field: keyof CardFieldVisibility, value: boolean) => {
    setVisibility((prev) => {
      const next = { ...prev, [field]: value };
      saveVisibility(next);
      return next;
    });
  }, []);

  return [visibility, setField];
}
