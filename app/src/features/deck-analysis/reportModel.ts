import { cardLegalityStatus, availableDeckElements, isAvailableDeckRecommendation, packageReport, reportCounts, weightedJaccard, type Card, type ClusterMatchupImpact, type ReportDeck } from '@gatcg/shared';
import type { DeckBuilderRow } from '../deckbuilder/useDeckBuilderPopulation';
import type { DeckWorkspace } from '../deckbuilder/persistence/deckWorkspace';
import { swapMainCard } from '../../lib/deckEditing';
import { deckDestinationEligibility } from '../../lib/deckSectionEligibility';

export function comparableReportDecks(deck: ReportDeck, rows: readonly DeckBuilderRow[], membership: Record<string, string>, clusterId: string | undefined, catalog: ReadonlyMap<string, Card>) {
  if (!clusterId) return [];
  const elements = (material: Iterable<string>) => [...availableDeckElements([...material].map(name => catalog.get(name)))].sort().join('|');
  const identity = elements(reportCounts(deck.material).keys());
  const counts = reportCounts([...deck.main, ...deck.material]);
  const eligible = rows.filter(row => membership[row.deckId] === clusterId && row.main.size && row.eventDate && Number.isFinite(Date.parse(row.eventDate)) && elements(row.material.keys()) === identity);
  const newest = eligible.reduce((date, row) => row.eventDate! > date ? row.eventDate! : date, '');
  if (!newest) return [];
  const cutoff = new Date(Date.parse(newest) - 180 * 86400000).toISOString().slice(0, 10);
  return [...new Map(eligible.filter(row => row.eventDate! >= cutoff).map(row => [row.deckId, row])).values()].map(row => {
    const other = new Map(row.main);
    for (const [name, quantity] of row.material) other.set(name, (other.get(name) ?? 0) + quantity);
    return { ...row, similarity: weightedJaccard(counts, other) };
  }).sort((a, b) => b.similarity - a.similarity || b.eventDate!.localeCompare(a.eventDate!) || a.deckId.localeCompare(b.deckId));
}
export type ComparableDeck = ReturnType<typeof comparableReportDecks>[number];
export function referenceDifferences(deck: ReportDeck, reference: ComparableDeck) {
  return (['main', 'material'] as const).flatMap(section => {
    const current = reportCounts(deck[section]);
    return [...new Set([...current.keys(), ...reference[section].keys()])].map(name => ({ name, section, current: current.get(name) ?? 0, reference: reference[section].get(name) ?? 0 })).filter(row => row.current !== row.reference);
  });
}
export interface ReportSwap { cut: string; add: string; referenceId: string; reason: string; gain: number }
export type SuggestionGoal = 'consistency' | 'matchup' | 'alternatives';
export function suggestReportSwaps(deck: DeckWorkspace, references: readonly ComparableDeck[], catalog: ReadonlyMap<string, Card>, goal: SuggestionGoal, locked: ReadonlySet<string>, preservedPackage: string, matchup?: ClusterMatchupImpact) {
  if (deck.format !== 'STANDARD' || [...deck.main, ...deck.material].some(line => !catalog.has(line.name))) return [];
  const all = reportCounts([...deck.main, ...deck.material, ...deck.sideboard]);
  const elements = availableDeckElements(deck.material.map(line => catalog.get(line.name)));
  const before = packageReport(deck);
  const beforeAccess = new Map(before.map(row => [row.definition.id, row.checkpoints[1].both]));
  const suggestions: ReportSwap[] = [];
  const seen = new Set<string>();
  for (const reference of references.slice(0, 12)) {
    const diffs = referenceDifferences(deck, reference).filter(row => row.section === 'main');
    const adds = diffs.filter(row => row.reference > row.current && !locked.has(row.name));
    const cuts = diffs.filter(row => row.current > row.reference && !locked.has(row.name));
    for (const add of adds) for (const cut of cuts) {
      if (seen.has(`${cut.name}|${add.name}`)) continue;
      seen.add(`${cut.name}|${add.name}`);
      const card = catalog.get(add.name);
      const limit = card?.legality?.STANDARD?.limit ?? 4;
      if (!isAvailableDeckRecommendation(card, elements) || !deckDestinationEligibility(card, 'main').allowed || !card || cardLegalityStatus(card, 'STANDARD') !== 'allowed' || (all.get(add.name) ?? 0) >= limit) continue;
      // Printing allocations need an explicit copy choice in the editor, never implicit reassignment.
      if (deck.printings?.main?.[cut.name]?.length) continue;
      const edited = swapMainCard({ main: deck.main.map(line => ({ card: line.name, quantity: line.quantity })), material: [], sideboard: [], maybeboard: [] }, cut.name, add.name, catalog);
      if (!edited) continue;
      const next = { ...deck, main: edited.main.map(line => ({ name: line.card, quantity: line.quantity })) };
      const after = packageReport(next);
      if (preservedPackage && (after.find(row => row.definition.id === preservedPackage)?.checkpoints[1].both ?? 0) < (beforeAccess.get(preservedPackage) ?? 0) - 1e-9) continue;
      const best = after.map(row => ({ row, delta: row.checkpoints[1].both - (beforeAccess.get(row.definition.id) ?? 0) })).sort((a, b) => b.delta - a.delta)[0];
      const evidence = matchup?.myCards.find(row => row.cardName === add.name && row.role === 'main' && row.adjustedLift > 0);
      if (goal === 'consistency' && (!best || best.delta <= 1e-9 || !best.row.lineage)) continue;
      if (goal === 'matchup' && !evidence) continue;
      const reason = goal === 'consistency' ? `${best!.row.definition.label} · +${(best!.delta * 100).toFixed(1)}pp access · 10 seen` : goal === 'matchup' ? `+${(evidence!.adjustedLift * 100).toFixed(1)}pp observed · ${evidence!.deckCountWith} with / ${evidence!.deckCountWithout} without` : `${Math.round(reference.similarity * 100)}% similar · ${reference.eventDate?.slice(0, 10)} reference`;
      suggestions.push({ cut: cut.name, add: add.name, referenceId: reference.deckId, reason, gain: goal === 'consistency' ? best!.delta : goal === 'matchup' ? evidence!.adjustedLift : reference.similarity });
    }
  }
  return suggestions.sort((a, b) => b.gain - a.gain || a.add.localeCompare(b.add) || a.cut.localeCompare(b.cut)).slice(0, 3);
}

export const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
export function referenceLink(id: string) { const [event, ...player] = id.split(':'); return `/events/${encodeURIComponent(event)}?tab=decklists&player=${encodeURIComponent(player.join(':'))}`; }
