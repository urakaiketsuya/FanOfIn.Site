export interface TagTarget { cardUuid: string; editionUuid: string | null }
export interface TagProposalInput {
  id: string;
  tag: string;
  action: "add" | "remove";
  targets: TagTarget[];
  reason: string;
}
export interface TagProposal extends TagProposalInput {
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  reviewedAt: string | null;
}
export interface TagOverride extends TagTarget {
  tag: string;
  action: "add" | "remove";
}
export interface TagProposalList {
  proposals: TagProposal[];
  canReview: boolean;
  nextOffset: number | null;
}
