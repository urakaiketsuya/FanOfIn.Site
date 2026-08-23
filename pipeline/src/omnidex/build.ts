import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  slugify,
  type OmnidexEventSummary,
  type OmnidexIndexData,
  type OmnidexJudgeSummary,
  type OmnidexPlayerSummary,
  type OmnidexSeasonSummary,
  type OmnidexTeamSighting,
} from "@gatcg/shared";
import { readCachedBundle, listCachedBundles } from "./cache.js";

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../data/omnidex");

/**
 * Pure local transform: reads whatever's in the raw cache (populated by `crawler.ts`) and
 * derives the published index + player/judge rosters. Decoupled from network fetching so a
 * re-publish never needs to hit the API — only a crawl does.
 */
export async function buildOmnidexIndex(): Promise<{
  index: OmnidexIndexData;
  players: OmnidexPlayerSummary[];
  judges: OmnidexJudgeSummary[];
  teams: OmnidexTeamSighting[];
}> {
  const allBundles = await listCachedBundles();

  const events: OmnidexEventSummary[] = [];
  const seasonsById = new Map<number, OmnidexSeasonSummary>();
  const playersById = new Map<number, OmnidexPlayerSummary>();
  const judgesById = new Map<number, OmnidexJudgeSummary>();
  const teams: OmnidexTeamSighting[] = [];

  for (const bundle of allBundles) {
    if (bundle.event.status !== "complete") continue;
    const { event, players, judges } = bundle;

    events.push({
      id: event.id,
      name: event.name,
      date: event.date,
      format: event.format,
      status: event.status,
      structure: event.structure,
      type: event.type,
      category: event.category,
      ranked: event.ranked,
      decklists: event.decklists,
      playerCount: event.players.length,
      seasonId: event.season?.id ?? null,
      seasonName: event.season?.name ?? null,
      seasonSlug: event.season ? slugify(event.season.name) : null,
      hostName: event.host?.name ?? "",
      hostId: event.host?.id ?? 0,
      hostAddress: event.host?.address ?? "",
      hostCountry: event.host?.addressCountryCode ?? "??",
      setting: event.setting,
      url: event.url,
    });

    if (event.season && !seasonsById.has(event.season.id)) {
      seasonsById.set(event.season.id, {
        id: event.season.id,
        name: event.season.name,
        slug: slugify(event.season.name),
        dateStart: event.season.dateStart,
        dateEnd: event.season.dateEnd,
      });
    }

    for (const player of players) {
      const existing = playersById.get(player.id);
      if (existing) {
        existing.username = player.username;
        existing.country = player.country;
        existing.emblem = player.emblem;
        if (!existing.eventIds.includes(event.id)) existing.eventIds.push(event.id);
      } else {
        playersById.set(player.id, {
          id: player.id,
          username: player.username,
          country: player.country,
          emblem: player.emblem,
          eventIds: [event.id],
        });
      }
    }

    if (!("error" in judges)) {
      for (const judge of judges) {
        const existing = judgesById.get(judge.id);
        if (existing) {
          existing.username = judge.username;
          existing.country = judge.country;
          existing.emblem = judge.emblem;
          existing.judgeLevel = Math.max(existing.judgeLevel, judge.judgeLevel);
          existing.judgeExperience = Math.max(existing.judgeExperience, judge.judgeExperience);
          if (!existing.eventIds.includes(event.id)) existing.eventIds.push(event.id);
        } else {
          judgesById.set(judge.id, {
            id: judge.id,
            username: judge.username,
            country: judge.country,
            emblem: judge.emblem,
            judgeLevel: judge.judgeLevel,
            judgeExperience: judge.judgeExperience,
            eventIds: [event.id],
          });
        }
      }
    }

    if (!("error" in bundle.teams)) {
      for (const team of bundle.teams) {
        if (team.players.length === 0) continue; // registered but never fielded a lineup
        teams.push({
          eventId: event.id,
          eventName: event.name,
          eventDate: event.date,
          eventCategory: event.category,
          seasonId: event.season?.id ?? null,
          seasonName: event.season?.name ?? null,
          teamName: team.name,
          finalPlacement: team.finalPlacement,
          players: team.players.map((p) => ({ id: p.id, slot: p.slot })),
        });
      }
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date));
  teams.sort((a, b) => b.eventDate.localeCompare(a.eventDate));

  return {
    index: { generatedAt: new Date().toISOString(), events, seasons: Array.from(seasonsById.values()) },
    players: Array.from(playersById.values()),
    judges: Array.from(judgesById.values()),
    teams,
  };
}

export async function writeOmnidexData(
  index: OmnidexIndexData,
  players: OmnidexPlayerSummary[],
  judges: OmnidexJudgeSummary[],
  teams: OmnidexTeamSighting[],
): Promise<void> {
  const eventsOutDir = path.join(DATA_DIR, "events");
  await mkdir(eventsOutDir, { recursive: true });
  await writeFile(path.join(DATA_DIR, "index.json"), JSON.stringify(index), "utf-8");
  await writeFile(path.join(DATA_DIR, "players.json"), JSON.stringify({ generatedAt: index.generatedAt, players }), "utf-8");
  await writeFile(path.join(DATA_DIR, "judges.json"), JSON.stringify({ generatedAt: index.generatedAt, judges }), "utf-8");
  await writeFile(path.join(DATA_DIR, "teams.json"), JSON.stringify({ generatedAt: index.generatedAt, teams }), "utf-8");

  // Publish per-event bundles as small standalone files, fetched on-demand by event pages (Phase 8).
  for (const summary of index.events) {
    const bundle = await readCachedBundle(summary.id);
    if (bundle) await writeFile(path.join(eventsOutDir, `${summary.id}.json`), JSON.stringify(bundle), "utf-8");
  }
}
