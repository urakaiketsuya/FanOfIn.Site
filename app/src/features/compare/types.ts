import type { OmnidexDecklist } from "@gatcg/shared";

export type ComparedDeckSource =
  | { kind: "sighting"; eventId: number; player: number }
  | { kind: "custom"; decklist: OmnidexDecklist };

export interface ComparedDeck {
  /** Unique within the compare set — `${eventId}:${player}` for sightings, a generated id for custom decks. */
  key: string;
  label: string;
  source: ComparedDeckSource;
}
