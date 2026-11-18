import type { SharedPackage } from './sharedPackageLink.js';
export interface PackageResearchReview {
  kind: 'suggested' | 'win-rate' | 'experimental' | 'construction';
  key: string;
  fingerprint: string;
  dismissed: boolean;
}
export interface EditorialPackage {
  id: string;
  research?: PackageResearchReview;
  definition: SharedPackage;
  status: 'draft' | 'published';
  revision: number;
  updatedAt: string;
}
export interface CollectionEngagement {
  asOf: string;
  active7Days: number;
  active30Days: number;
  adoptionPercent: number | null;
  weeks: { start: string; firstCollectors: number }[];
}
export interface AdminOverview {
  collectionEngagement: CollectionEngagement;
  users: { total: number };
  collection: { users: number; ownedCopies: number; proxyCopies: number };
  decks: { private: number; unlisted: number; public: number; total: number };
}
export interface EditorialPackageInput {
  research?: PackageResearchReview;
  definition: SharedPackage;
  status: 'draft' | 'published';
  revision: number;
}
