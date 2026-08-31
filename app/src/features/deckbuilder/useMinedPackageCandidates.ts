import { usePublishedData } from "../../lib/sync/usePublishedData";

export interface MinedPackageCandidate {
  anchorCard: string;
  memberCards: string[];
  matchingDecks: number;
  anchorDecks: number;
  support: number;
  confidence: number;
  lift: number;
  championCoverage: number;
  strongestChampions: { championName: string; matchingDecks: number; confidence: number; lift: number }[];
  evidenceKinds: string[];
  confidenceScore: number;
  cautions: string[];
}

export interface MinedPackageFamily {
  anchorCard: string;
  coreCards: string[];
  optionCards: string[];
  minOptions: number;
  evidenceKinds: string[];
  candidateCount: number;
  confidenceScore: number;
  matchingDecks: number;
}

interface PackageCandidatesData {
  generatedAt: string;
  candidates: MinedPackageCandidate[];
  families?: MinedPackageFamily[];
}

export function useMinedPackageCandidates(): PackageCandidatesData | undefined {
  return usePublishedData<PackageCandidatesData>("analysis-package-candidates", "/data/analysis/package-candidates.json");
}
