import Dexie, { type EntityTable } from "dexie";
import type {
  Card,
  CardPriceEntry,
  FeaturedSetGroup,
  OmnidexApiError,
  OmnidexDecklistEntry,
  OmnidexEvent,
  OmnidexJudge,
  OmnidexPlayer,
  OmnidexStandingsResponse,
} from "@gatcg/shared";

export interface SyncMetaRow {
  key: string;
  lastSyncedAt: string;
  /** Latest `last_update` timestamp seen among synced rows, used for incremental refresh. */
  cursor: string | null;
}

export interface PriceRow extends CardPriceEntry {
  /** `priceKey(setPrefix, collectorNumber)` from @gatcg/shared. */
  key: string;
}

export interface OmnidexEventBundle {
  id: number;
  event: OmnidexEvent;
  players: OmnidexPlayer[];
  standings: OmnidexStandingsResponse | OmnidexApiError;
  judges: OmnidexJudge[] | OmnidexApiError;
  teams: unknown | OmnidexApiError;
  decklists: OmnidexDecklistEntry[] | OmnidexApiError;
  statistics: unknown | OmnidexApiError;
  fetchedAt: string;
}

/** Generic cache for pipeline-published JSON (data/omnidex/*.json, data/analysis/*.json) — see usePublishedData. */
export interface PublishedDataRow {
  key: string;
  generatedAt: string;
  data: unknown;
}

/**
 * The persistent local cache (IndexedDB). Card catalog is bulk-synced once
 * (Phase 1) and browsed entirely against this store; other tables are added
 * as later phases need them.
 */
export class GatcgDB extends Dexie {
  cards!: EntityTable<Card, "uuid">;
  featuredSets!: EntityTable<FeaturedSetGroup, "uuid">;
  prices!: EntityTable<PriceRow, "key">;
  omnidexEvents!: EntityTable<OmnidexEventBundle, "id">;
  published!: EntityTable<PublishedDataRow, "key">;
  syncMeta!: EntityTable<SyncMetaRow, "key">;

  constructor() {
    super("gatcg-explorer");
    this.version(1).stores({
      cards: "uuid, slug, name, *classes, *types, *subtypes, *elements, last_update",
      syncMeta: "key",
    });
    this.version(2).stores({
      featuredSets: "uuid",
    });
    this.version(3).stores({
      prices: "key",
    });
    this.version(4).stores({
      omnidexEvents: "id",
    });
    this.version(5).stores({
      published: "key",
    });
  }
}

export const db = new GatcgDB();
