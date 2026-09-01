import { useEffect, useState } from "react";

const STORAGE_KEY = "decklist-evidence-prefs-v1";

interface DecklistEvidencePrefs {
  tuningEvidence: boolean;
  metaGaps: boolean;
}

const DEFAULTS: DecklistEvidencePrefs = { tuningEvidence: true, metaGaps: true };

function load(): DecklistEvidencePrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<DecklistEvidencePrefs>;
    return { tuningEvidence: parsed.tuningEvidence ?? true, metaGaps: parsed.metaGaps ?? true };
  } catch {
    return DEFAULTS;
  }
}

// Module-level cache + pub/sub, not React context: several independent components on the same
// page (DecklistView's own toggle, plus DeckDecaySignals's caller reading the same pref) all need
// to react instantly to one change without a provider wrapping every decklist-rendering page.
let cached: DecklistEvidencePrefs | null = null;
const listeners = new Set<(prefs: DecklistEvidencePrefs) => void>();

function getPrefs(): DecklistEvidencePrefs {
  if (!cached) cached = load();
  return cached;
}

function setPrefs(next: DecklistEvidencePrefs) {
  cached = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota exceeded — preference just won't persist */
  }
  listeners.forEach((listener) => listener(next));
}

/** Per-browser (not per-account) preference for whether to show the optional evidence panels on
 * decklist pages (DeckTuningEvidence, DeckDecaySignals) — both real computational costs
 * (useChampionCardImpact / useDeckBuilderPopulation), so callers should skip rendering those
 * components entirely when the relevant flag is off rather than rendering and hiding them. */
export function useDecklistEvidencePrefs() {
  const [prefs, setLocalPrefs] = useState(getPrefs);

  useEffect(() => {
    const listener = (next: DecklistEvidencePrefs) => setLocalPrefs(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    ...prefs,
    setTuningEvidence: (value: boolean) => setPrefs({ ...getPrefs(), tuningEvidence: value }),
    setMetaGaps: (value: boolean) => setPrefs({ ...getPrefs(), metaGaps: value }),
  };
}
