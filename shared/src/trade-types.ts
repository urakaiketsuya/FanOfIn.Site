export type BinderItemKind = "available" | "wanted";
export type TradeMethod = "local" | "shipping" | "either";
export type TradeStatus = "sent" | "countered" | "accepted" | "sender_sent" | "recipient_sent" | "both_sent" | "completed" | "declined" | "cancelled" | "disputed";

export interface BinderItem {
  id: string;
  kind: BinderItemKind;
  cardUuid: string;
  cardName: string;
  editionUuid: string | null;
  setPrefix: string | null;
  collectorNumber: string | null;
  quantity: number;
  reservedQuantity: number;
  condition: string;
  language: string;
  acceptsAlternatives: boolean;
  updatedAt: string;
}

export interface BinderSettings {
  public: boolean;
  tradeMethod: TradeMethod;
  location: string;
  notes: string;
  updatedAt: string | null;
}

export interface PublicBinder {
  owner: { displayName: string; profileSlug: string };
  settings: BinderSettings;
  items: BinderItem[];
}

export interface TradeLine {
  direction: "sender_gives" | "recipient_gives";
  binderItemId: string;
  cardUuid: string;
  cardName: string;
  editionUuid: string | null;
  setPrefix: string | null;
  collectorNumber: string | null;
  quantity: number;
}

export interface TradeRevision {
  number: number;
  proposerProfileSlug: string;
  message: string;
  lines: TradeLine[];
  createdAt: string;
}

export interface Trade {
  id: string;
  status: TradeStatus;
  sender: { displayName: string; profileSlug: string };
  recipient: { displayName: string; profileSlug: string };
  currentRevision: TradeRevision;
  createdAt: string;
  updatedAt: string;
}
