import type { BroadcastTimelineMatch } from './broadcast-timeline-types.js';

export interface BroadcastEventPlayer { id: number; name: string; score: number; status: string }
export interface BroadcastEventPairing {
  id: string; round: number; label: string; bronze: boolean; players: BroadcastEventPlayer[];
  winner?: number; next?: string; recapId?: string;
}
export interface BroadcastEventStage { id: number; type: string; rounds: number[]; matches: BroadcastEventPairing[] }
export interface BroadcastEventMap {
  id: number; name: string; aliases: string[]; date: string; playerCount: number;
  stages: BroadcastEventStage[]; recapIds: string[]; unlinkedRecapIds: string[];
}
export interface BroadcastEventMaps { generatedAt: string; events: BroadcastEventMap[] }

export function recapStage(round: string): 'swiss' | 'single-elimination' {
  return /^Round\s+\d+/i.test(round) ? 'swiss' : 'single-elimination';
}

/** Input reflects the saved API payload, whose round/stage are objects in newer snapshots. */
export interface BroadcastEventSource {
  id: number;
  event: { date: string; players: number[]; name: string; stages: { id: number; type: string }[] };
  players: { id: number; username: string }[];
  pairingsByRound: { error?: string; stage?: number | { id: number }; round?: number | { id: number }; pairings?: { id: number; label?: string; status: string; pairing: { id: number; score: number; status: string }[] }[] }[];
}
const numericId = (value: number | { id: number } | undefined) => typeof value === 'number' ? value : value?.id;
const nameKey = (name: string) => name.trim().toLowerCase();

export function buildBroadcastEventMap(source: BroadcastEventSource, recaps: BroadcastTimelineMatch[]): BroadcastEventMap {
  const names = new Map(source.players.map(p => [p.id, p.username]));
  const stages: BroadcastEventStage[] = source.event.stages.map(stage => {
    const matches: BroadcastEventPairing[] = [];
    for (const row of source.pairingsByRound) {
      const round = numericId(row.round);
      if (row.error || numericId(row.stage) !== stage.id || !round) continue;
      for (const pairing of row.pairings ?? []) {
        const winners = pairing.pairing.filter(p => p.status === 'winner');
        matches.push({ id: `${stage.id}:${round}:${pairing.id}`, round, label: pairing.label ?? '', bronze: /bronze|third place/i.test(pairing.label ?? ''),
          players: pairing.pairing.map(p => ({ id: p.id, name: names.get(p.id) ?? `Player ${p.id}`, score: p.score, status: p.status })),
          ...(pairing.status === 'complete' && winners.length === 1 ? { winner: winners[0].id } : {}),
        });
      }
    }
    const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);
    if (stage.type === 'single-elimination') for (const match of matches) {
      if (match.winner === undefined || match.bronze) continue;
      const next = matches.filter(m => m.round === match.round + 1 && !m.bronze && m.players.some(p => p.id === match.winner));
      if (next.length === 1) match.next = next[0].id;
    }
    return { id: stage.id, type: stage.type, rounds, matches };
  });
  const linked = new Set<string>();
  for (const recap of recaps) {
    if (recap.players.some(p => p.eventDecklist === 'unverified-identity')) continue;
    const type = recapStage(recap.round);
    const roundNumber = type === 'swiss' ? Number(recap.round.match(/^Round\s+(\d+)/i)?.[1]) : undefined;
    const bronze = /^Bronze/i.test(recap.round);
    const candidates = stages.filter(s => s.type === type).flatMap(s => s.matches).filter(m =>
      m.players.length === 2 && m.bronze === bronze && (roundNumber === undefined || m.round === roundNumber) &&
      recap.players.every(p => m.players.some(other => nameKey(other.name) === nameKey(p.name))));
    // Ambiguous aliases, rematches and duplicate recap assignments stay separate.
    if (candidates.length === 1 && !candidates[0].recapId) { candidates[0].recapId = recap.id; linked.add(recap.id); }
  }
  return { id: source.id, name: recaps[0]?.event.replace(/ Swiss Stage$/, '') ?? source.event.name,
    aliases: [...new Set(recaps.map(m => m.event))], date: source.event.date, playerCount: source.event.players.length,
    stages, recapIds: recaps.map(m => m.id), unlinkedRecapIds: recaps.filter(m => !linked.has(m.id)).map(m => m.id) };
}
