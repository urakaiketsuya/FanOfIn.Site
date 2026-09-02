import { useEffect, useState } from "react";

const STORAGE_KEY = "decklist-display-prefs-v1";

interface DecklistDisplayPrefs {
  tuningEvidence: boolean;
  metaGaps: boolean;
  diaoScore: boolean;
  winRate: boolean;
}

const DEFAULTS: DecklistDisplayPrefs = { tuningEvidence: true, metaGaps: true, diaoScore: false, winRate: false };

function load(): DecklistDisplayPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<DecklistDisplayPrefs>;
    return {
      tuningEvidence: parsed.tuningEvidence ?? DEFAULTS.tuningEvidence,
      metaGaps: parsed.metaGaps ?? DEFAULTS.metaGaps,
      diaoScore: parsed.diaoScore ?? DEFAULTS.diaoScore,
      winRate: parsed.winRate ?? DEFAULTS.winRate,
    };
  } catch {
    return DEFAULTS;
  }
}

// Module-level cache + pub/sub, not React context: several independent components on the same
// page (DecklistView's own sections, plus DeckDecaySignals's caller reading the same pref) all
// need to react instantly to one change without a provider wrapping every decklist-rendering page.
let cached: DecklistDisplayPrefs | null = null;
const listeners = new Set<(prefs: DecklistDisplayPrefs) => void>();

function getPrefs(): DecklistDisplayPrefs {
  if (!cached) cached = load();
  return cached;
}

function setPrefs(next: DecklistDisplayPrefs) {
  cached = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota exceeded — preference just won't persist */
  }
  listeners.forEach((listener) => listener(next));
}

/** Per-browser (not per-account) preferences for the optional sections on decklist pages —
 * evidence panels (DeckTuningEvidence, DeckDecaySignals) plus the DIAO score and per-sighting win
 * rate sections in DecklistView. Managed from the `/settings` page rather than inline per-decklist
 * controls, since the inline "Evidence settings" disclosure didn't work well on mobile. Several are
 * real computational or fetch costs (useChampionCardImpact / useDeckBuilderPopulation / the deck
 * popularity index), so callers should skip rendering those components entirely when the relevant
 * flag is off rather than rendering and hiding them. */
export function useDecklistDisplayPrefs() {
  const [prefs, setLocalPrefs] = useState(getPrefs);

  useEffect(() => {
    const listener = (next: DecklistDisplayPrefs) => setLocalPrefs(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    ...prefs,
    setTuningEvidence: (value: boolean) => setPrefs({ ...getPrefs(), tuningEvidence: value }),
    setMetaGaps: (value: boolean) => setPrefs({ ...getPrefs(), metaGaps: value }),
    setDiaoScore: (value: boolean) => setPrefs({ ...getPrefs(), diaoScore: value }),
    setWinRate: (value: boolean) => setPrefs({ ...getPrefs(), winRate: value }),
  };
}
