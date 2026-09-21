import { useState } from "react";

export type BuilderReviewSubTab = "suggestions" | "matchups" | "similarDecks";

export function useBuilderReviewTabs({ reviewItemCount, showMatchups, showSimilarDecks }: { reviewItemCount: number; showMatchups: boolean; showSimilarDecks: boolean }) {
  const tabs: { key: BuilderReviewSubTab; label: string }[] = [
    { key: "suggestions", label: reviewItemCount > 0 ? `Suggestions (${reviewItemCount})` : "Suggestions" },
    ...(showMatchups ? [{ key: "matchups" as const, label: "Matchups" }] : []),
    ...(showSimilarDecks ? [{ key: "similarDecks" as const, label: "Similar decks" }] : []),
  ];
  const [selectedTab, setSelectedTab] = useState<BuilderReviewSubTab>("suggestions");
  const activeTab = tabs.some((tab) => tab.key === selectedTab) ? selectedTab : tabs[0].key;
  return { tabs, activeTab, setActiveTab: setSelectedTab };
}
