import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ACHIEVEMENT_CATEGORY_LABELS,
  ACHIEVEMENT_CATEGORY_ORDER,
  type AchievementDefinition,
  type AchievementUnlock,
} from "@gatcg/shared";
import { useAchievementsData } from "./data";
import { useOmnidexPlayers } from "../tournaments/data";
import PlayerLink from "../players/PlayerLink";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageHeader from "../../components/ui/PageHeader";
import PageLayout from "../../components/layout/PageLayout";
import Panel from "../../components/ui/Panel";
import Section from "../../components/ui/Section";
import { EmptyState, InlineState } from "../../components/ui/ContentState";

const RECENT_HOLDERS_SHOWN = 5;

export default function AchievementsIndex() {
  useDocumentTitle("Achievements", "Data-derived achievement badges earned across Grand Archive TCG tournament history.");
  const achievementsData = useAchievementsData();
  const playersData = useOmnidexPlayers();

  const usernameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of playersData?.players ?? []) map.set(p.id, p.username);
    return map;
  }, [playersData]);

  const unlocksByAchievement = useMemo(() => {
    const map = new Map<string, AchievementUnlock[]>();
    for (const u of achievementsData?.unlocks ?? []) {
      const list = map.get(u.achievementId) ?? [];
      list.push(u);
      map.set(u.achievementId, list);
    }
    return map;
  }, [achievementsData]);

  const byCategory = useMemo(() => {
    const map = new Map<string, AchievementDefinition[]>();
    for (const def of achievementsData?.definitions ?? []) {
      const list = map.get(def.category) ?? [];
      list.push(def);
      map.set(def.category, list);
    }
    return map;
  }, [achievementsData]);

  return (
    <PageLayout>
      <PageHeader
        title="Achievements"
        description="Every badge here is derived automatically from tournament results, ratings, and decklists already ingested — there's no manual submission or curation involved."
      />

      {!achievementsData && <InlineState className="mt-6">Loading…</InlineState>}
      {achievementsData && achievementsData.definitions.length === 0 && (
        <EmptyState className="mt-6" title="No achievements have been derived yet" />
      )}

      {ACHIEVEMENT_CATEGORY_ORDER.map((category) => {
        const defs = byCategory.get(category);
        if (!defs || defs.length === 0) return null;
        return (
          <Section key={category} className="mt-8" heading="compact" title={ACHIEVEMENT_CATEGORY_LABELS[category]}>
            <div className="mt-2 space-y-4">
              {defs.map((def) => {
                const unlocks = unlocksByAchievement.get(def.id) ?? [];
                const recent = unlocks.slice(0, RECENT_HOLDERS_SHOWN);
                return (
                  <Panel key={def.id} padding="sm" className="rounded-md bg-transparent">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <Link to={`/achievements/${def.id}`} className="font-semibold text-ctp-text hover:text-ctp-blue">
                        {def.name}
                      </Link>
                      <Link to={`/achievements/${def.id}`} className="text-xs text-ctp-subtext0 hover:text-ctp-blue hover:underline">
                        {unlocks.length} player{unlocks.length === 1 ? "" : "s"} &rarr;
                      </Link>
                    </div>
                    <p className="mt-0.5 text-sm text-ctp-subtext1">{def.description}</p>
                    {recent.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ctp-subtext0">
                        <span>Recent:</span>
                        {recent.map((u, i) => (
                          <span key={i}>
                            <PlayerLink
                              id={u.playerId}
                              username={usernameById.get(u.playerId) ?? `Player #${u.playerId}`}
                              className="text-ctp-blue hover:underline"
                            />{" "}
                            <span className="text-ctp-subtext0">({u.context})</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </Panel>
                );
              })}
            </div>
          </Section>
        );
      })}
    </PageLayout>
  );
}
