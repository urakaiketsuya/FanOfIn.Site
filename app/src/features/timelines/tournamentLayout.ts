import type { BroadcastEventStage } from '@gatcg/shared';
export function tournamentRoundLabel(stage: BroadcastEventStage, round: number) {
  if (stage.type !== 'single-elimination') return `Round ${round}`;
  const remaining = Math.max(...stage.rounds) - round;
  return remaining === 0 ? 'Final' : remaining === 1 ? 'Semifinals' : remaining === 2 ? 'Quarterfinals' : `Top ${2 ** (remaining + 1)}`;
}
/** A verified branch ending at one match, with at most three rounds. Unlinked matches remain visible separately. */
export function tournamentWindow(stage: BroadcastEventStage, start: number, section: number) {
  const rounds = stage.rounds.filter(r => r >= start).slice(0, 3);
  const terminal = rounds.at(-1);
  const roots = stage.matches.filter(m => m.round === terminal && !m.bronze);
  const root = roots[Math.min(Math.max(section, 0), Math.max(0, roots.length - 1))];
  const included = new Set(root ? [root.id] : []);
  for (const round of [...rounds].reverse()) for (const m of stage.matches) if (m.round === round && m.next && included.has(m.next)) included.add(m.id);
  return { rounds, roots, matches: stage.matches.filter(m => included.has(m.id)), unlinked: stage.matches.filter(m => rounds.includes(m.round) && !included.has(m.id) && !m.bronze && !m.next && m.round !== terminal) };
}
