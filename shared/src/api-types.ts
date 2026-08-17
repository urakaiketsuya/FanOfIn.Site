/**
 * Grand Archive API response shapes (api.gatcg.com). Verified against live
 * responses, not just the docs prose — some fields differ from api-docs.gatcg.com
 * (option keys are camelCase; class/type/element option values have no `display`).
 * Only fields actually used so far are typed — expand as later phases need more.
 */

export interface CardCost {
  type: "memory" | "none" | "reserve";
  value: string | null;
}

export interface CardSet {
  id: string;
  name: string;
  prefix: string;
  language: string;
  release_date: string;
  created_at: string;
  last_update: string;
}

export interface CardEdition {
  uuid: string;
  card_id: string;
  slug: string;
  collector_number: string;
  configuration: string;
  orientation: string | null;
  rarity: number;
  illustrator: string | null;
  image: string;
  set: CardSet;
  effect: string | null;
  effect_html: string | null;
  effect_raw: string | null;
  flavor: string | null;
  last_update: string;
  created_at: string;
}

export interface CardReference {
  kind: string;
  name: string;
  slug: string;
  direction: "TO" | "FROM";
}

/** Keyed by game format (e.g. "STANDARD", "PANTHEON"); `limit` is max copies allowed (0 = banned). */
export type CardLegality = Record<string, { limit: number }>;

export interface Card {
  uuid: string;
  slug: string;
  name: string;
  classes: string[];
  types: string[];
  subtypes: string[];
  elements: string[];
  element: string;
  cost: CardCost;
  cost_memory: number | null;
  cost_reserve: number | null;
  power: number | null;
  speed: boolean | null;
  life: number | null;
  level: number | null;
  durability: number | null;
  effect: string | null;
  effect_html: string | null;
  effect_raw: string | null;
  flavor: string | null;
  editions: CardEdition[];
  references: CardReference[];
  referenced_by: CardReference[];
  result_editions?: CardEdition[];
  rule?: unknown[];
  legality: CardLegality | null;
  last_update: string;
}

export interface CardSearchResponse {
  data: Card[];
  has_more: boolean;
  order: "ASC" | "DESC";
  page: number;
  page_size: number;
  paginated_cards_count: number;
  sort: string;
  total_cards: number;
  total_pages: number;
}

export interface OptionValue {
  text: string;
  value: string;
  display?: string;
}

/** GET /option/search — filter definitions used to build the browse UI. Keys are camelCase. */
export interface OptionDefinitions {
  class: OptionValue[];
  type: OptionValue[];
  subtype: OptionValue[];
  element: OptionValue[];
  rarity: OptionValue[];
  set: OptionValue[];
  gameFormat: OptionValue[];
  language: OptionValue[];
  stat: (OptionValue & { group: string })[];
  [key: string]: OptionValue[];
}

export interface FeaturedSet {
  id: string;
  name: string;
  prefix: string;
  language: string;
  release_date: string;
  created_at: string;
  last_update: string;
}

export interface FeaturedSetGroup {
  uuid: string;
  name: string;
  image: string;
  sets: FeaturedSet[];
}

export interface ApiMeta {
  commit_hash: string;
  db: string;
  deploy_hash: string;
  message: string;
  request_received: number;
}

export interface ChangelogEntry {
  uuid: string;
  date: string;
  content: string;
}

export type ThemaKind = "FOIL" | "NONFOIL";

export interface ThemaScore {
  rank: number;
  rank_change: number;
  change: number | string;
  thema_total: number;
  thema_charm: number;
  thema_ferocity: number;
  thema_grace: number;
  thema_mystique: number;
  thema_valor: number;
}

export interface ThemaRankEntry {
  uuid: string;
  slug: string;
  name: string;
  classes: string[];
  types: string[];
  subtypes: string[];
  elements: string[];
  kind: ThemaKind;
  score: ThemaScore;
  edition: {
    uuid: string;
    slug: string;
    image: string;
    collector_number: string;
    rarity: number;
    set: CardSet;
  };
}

/** One daily snapshot from GET /cards/edition/{uuid}/dynamic-thema. */
export interface ThemaHistoryPoint {
  uuid: string;
  kind: ThemaKind;
  thema_total: number;
  thema_charm: number;
  thema_ferocity: number;
  thema_grace: number;
  thema_mystique: number;
  thema_valor: number;
  created_at: string;
  rank: number;
  rank_change: number;
  change: number | string;
}
