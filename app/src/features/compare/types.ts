import type { DeckFormat, OmnidexDecklist } from "@gatcg/shared";

export type ComparedDeckSource =
  | { kind: "sighting"; eventId: number; player: number }
  | { kind: "custom"; decklist: OmnidexDecklist };

export interface ComparedDeck {
  /** Unique within the compare set — `${eventId}:${player}` for sightings, a generated id for custom decks. */
  key: string;
  label: string;
  source: ComparedDeckSource;
  format?: DeckFormat;
}

/** Sighting labels use `player @ event`; custom labels remain a single primary line. */
export function splitDeckLabel(label: string): { primary: string; secondary: string | null } {
  const at = label.indexOf(" @ ");
  return at === -1
    ? { primary: label, secondary: null }
    : { primary: label.slice(0, at), secondary: label.slice(at + 3) };
}

export function shortDeckLabel(label: string): string {
  return splitDeckLabel(label).primary;
}
