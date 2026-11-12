import { decodeCardLines, type DeckCardIndexData, type DeckSighting, type AchievementsData } from './analysis-types';

export interface BestPlayerRow {
  playerId: number; rank: number; score: number; events: number; wins: number; losses: number; ties: number; latestDate: string;
}
export interface CardBestPlayers {
  card: string; format: string; seasonId: number | null; seasonName: string; players: BestPlayerRow[];
}
export interface BestPlayersData { generatedAt: string; rankings: CardBestPlayers[] }
export const BEST_PLAYER_DEFINITION = { id: 'best-player', name: 'Best Player', description: 'Ranked in the top 10 for a card, with at least 3 events and 10 recorded matches.', category: 'playstyle' as const };

/** Completed public decklists only. Callers supply completed-event sightings. */
export function computeBestPlayers(index: DeckCardIndexData, sightings: Pick<DeckSighting, 'deckId' | 'player' | 'format' | 'seasonId' | 'seasonName' | 'eventDate' | 'weightedScore' | 'wins' | 'losses' | 'ties' | 'placement'>[], generatedAt: string): BestPlayersData {
  const decks = new Map(index.decks.map(d => [d.deckId, d]));
  const groups = new Map<string, CardBestPlayers & { byPlayer: Map<number, BestPlayerRow> }>();
  const seen = new Set<string>();
  for (const s of sightings) {
    if (seen.has(s.deckId) || !Number.isFinite(s.player) || !s.format || /team/i.test(s.format) || s.placement === null || !Number.isFinite(s.weightedScore) || Date.parse(s.eventDate) > Date.parse(generatedAt)) continue;
    seen.add(s.deckId);
    const deck = decks.get(s.deckId);
    if (!deck) continue;
    const names = new Set(decodeCardLines([...deck.main, ...deck.material], index.cardNames).filter(c => c.quantity > 0 && c.name).map(c => c.name));
    for (const card of names) for (const seasonId of s.seasonId === null ? [null] : [null, s.seasonId]) {
      const key = JSON.stringify([card, s.format, seasonId]);
      let group = groups.get(key);
      if (!group) { group = { card, format: s.format, seasonId, seasonName: seasonId === null ? 'All time' : s.seasonName ?? `Season ${seasonId}`, players: [], byPlayer: new Map() }; groups.set(key, group); }
      const row = group.byPlayer.get(s.player) ?? { playerId: s.player, rank: 0, score: 0, events: 0, wins: 0, losses: 0, ties: 0, latestDate: s.eventDate };
      row.score += s.weightedScore; row.events++; row.wins += s.wins; row.losses += s.losses; row.ties += s.ties;
      if (s.eventDate > row.latestDate) row.latestDate = s.eventDate;
      group.byPlayer.set(s.player, row);
    }
  }
  const rankings: CardBestPlayers[] = [];
  for (const { byPlayer, ...group } of groups.values()) {
    const eligible = [...byPlayer.values()].filter(r => r.events >= 3 && r.wins + r.losses + r.ties >= 10).sort((a, b) => b.score - a.score || a.playerId - b.playerId);
    let rank = 0;
    group.players = eligible.map((row, i) => { if (!i || Math.abs(row.score - eligible[i - 1].score) > 1e-9) rank = i + 1; return { ...row, rank }; }).filter(r => r.rank <= 10);
    if (group.players.length) rankings.push(group);
  }
  return { generatedAt, rankings: rankings.sort((a, b) => a.card.localeCompare(b.card) || a.format.localeCompare(b.format) || (b.seasonId ?? -1) - (a.seasonId ?? -1)) };
}

/** One badge per player, reflecting the published snapshot, rather than an invented first-earned date. */
export function withBestPlayerAchievements(achievements: AchievementsData, data: BestPlayersData): AchievementsData {
  const best = new Map<number, { row: BestPlayerRow; group: CardBestPlayers }>();
  for (const group of data.rankings) for (const row of group.players) {
    const prior = best.get(row.playerId);
    if (!prior || row.rank < prior.row.rank) best.set(row.playerId, { row, group });
  }
  return { ...achievements, generatedAt: data.generatedAt, definitions: [...achievements.definitions.filter(d => d.id !== BEST_PLAYER_DEFINITION.id), BEST_PLAYER_DEFINITION], unlocks: [
    ...achievements.unlocks.filter(u => u.achievementId !== BEST_PLAYER_DEFINITION.id),
    ...[...best].map(([playerId, { row, group }]) => ({ achievementId: BEST_PLAYER_DEFINITION.id, playerId, earnedAt: data.generatedAt, context: `#${row.rank} · ${group.card} · ${group.format} · ${group.seasonName} (current ranking)` })),
  ].sort((a, b) => b.earnedAt.localeCompare(a.earnedAt)) };
}
