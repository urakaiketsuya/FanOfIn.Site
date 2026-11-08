import type { SharedPackage } from './sharedPackageLink.js';
export interface EditorialPackage {
  id: string;
  definition: SharedPackage;
  status: 'draft' | 'published';
  revision: number;
  updatedAt: string;
}
export interface AdminOverview {
  decks: { private: number; unlisted: number; public: number; total: number };
}
export interface EditorialPackageInput {
  definition: SharedPackage;
  status: 'draft' | 'published';
  revision: number;
}
