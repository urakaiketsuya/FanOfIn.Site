export type DeckCommentTarget = { kind: "community"; id: string } | { kind: "tournament"; id: string };

export interface DeckCommentAuthor {
  displayName: string;
  profileSlug: string;
  avatarUrl: string | null;
}

export interface DeckComment {
  id: string;
  parentId: string | null;
  body: string;
  author: DeckCommentAuthor;
  createdAt: string;
  updatedAt: string;
  edited: boolean;
  deleted: boolean;
  mine: boolean;
  replies: DeckComment[];
}

export interface DeckCommentThread {
  target: DeckCommentTarget;
  locked: boolean;
  canLock: boolean;
  comments: DeckComment[];
  total: number;
}

export type CommentReportReason = "spam" | "abuse" | "harassment" | "other";
