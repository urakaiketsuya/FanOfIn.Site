import { buildMembership, seasonRecordedReports, competitionMatches, emptyRecord, matchRecord, addRecord, decodeCardLines, type ArchetypeTaxonomyData, type DeckCardIndexData, type DeckPopularityEntry, type OmnidexEventSummary, type CompetitionBattle, type CompetitionPlayer, type CompetitionPlace, type CompetitionTeam } from '@gatcg/shared';
import type { OmnidexEventBundle } from '../omnidex/cache.js';
import type { AnalysisContext } from './context.js';
import { writeJsonAtomic } from '../lib/atomicWrite.js';
import path from 'node:path';
import { eventField } from '../omnidex/eventField.js';

/** Bounded published reports. The adapter owns catalog/roster validation; shared owns arithmetic. */
export async function writeCompetitionReports(directory: string, bundles: OmnidexEventBundle[], ctx: AnalysisContext, entries: DeckPopularityEntry[], index: DeckCardIndexData, taxonomy: ArchetypeTaxonomyData) {
  const generatedAt = new Date().toISOString();
  const completed = [...new Map(bundles.map(b => [b.id, b])).values()].filter(b => b.event.status === 'complete' && Number.isFinite(Date.parse(b.event.date)) && b.event.date.slice(0, 10) <= generatedAt.slice(0, 10));
  const individual = completed.filter(b => !/team/i.test(b.event.format) && (('error' in b.teams && b.teams.error === 'Not a team event.') || (Array.isArray(b.teams) && !b.teams.length)));
  const to = individual.map(b => b.event.date.slice(0, 10)).sort().at(-1) ?? generatedAt.slice(0, 10);
  const shift = (day: string, offset: number) => new Date(Date.parse(day + 'T00:00:00Z') + offset * 86400000).toISOString().slice(0, 10);
  const from = shift(to, -89), previousFrom = shift(to, -179), previousTo = shift(to, -90);
  const membership = buildMembership(taxonomy), builds = new Map(taxonomy.clusters.map(b => [b.id, b]));
  const buildFor = (id: string) => builds.get(membership(id));
  const battle = new Map<string, CompetitionBattle>();
  const players = new Map<number, CompetitionPlayer>();
  const places = new Map<number, CompetitionPlace>();
  const placePeople = new Map<string, Map<number, number>>();
  const catalog = new Set([...ctx.cardIndex.values()].map(c => c.name.trim().toLowerCase()));
  const teams: CompetitionTeam[] = [];
  const summaries: OmnidexEventSummary[] = individual.map(b => ({ id: b.id, date: b.event.date, format: b.event.format, status: 'complete', seasonId: b.event.season?.id ?? null } as OmnidexEventSummary));
  const season = seasonRecordedReports(summaries, entries, index, taxonomy);
  const playerFormat = (id: number, format: string) => {
    const player = players.get(id) ?? { playerId: id, formats: [] };
    let row = player.formats.find(f => f.format === format);
    if (!row) { row = { format, record: emptyRecord(), events: 0, builds: [], opponents: [], unidentifiedOpponents: 0, evolution: [], changes: null }; player.formats.push(row); }
    players.set(id, player); return row;
  };
  for (const bundle of individual) {
    const date = bundle.event.date.slice(0, 10), format = bundle.event.format;
    if (date < previousFrom) continue;
    const period = date < from ? 0 : 1;
    const report = battle.get(format) ?? { format, periods: [{ from: previousFrom, to: previousTo, events: 0, pairingEvents: 0, matches: 0, identified: 0 }, { from, to, events: 0, pairingEvents: 0, matches: 0, identified: 0 }], rows: [] };
    const scope = report.periods[period]; scope.events++;
    if (bundle.pairingsByRound.length && bundle.pairingsByRound.every(r => !('error' in r))) scope.pairingEvents++;
    const signatures = ctx.getEventSignatures(bundle);
    const rawDecks = 'error' in bundle.decklists ? [] : bundle.decklists;
    const champion = (id: number) => {
      const decks = rawDecks.filter(d => d.player === id);
      if (decks.length !== 1 || decks[0].visible === false || ![decks[0].decklist.main, decks[0].decklist.material].every(s => s.length && s.every(c => c.quantity > 0 && Number.isInteger(c.quantity)))) return null;
      const sig = signatures.get(id); return sig?.unmatchedCardNames.length ? null : sig?.championName ?? null;
    };
    const matches = competitionMatches(bundle.pairingsByRound);
    const seenPlayers = new Set<number>();
    for (const match of matches) {
      scope.matches++;
      const left = champion(match.a), right = champion(match.b);
      if (left && right) {
        scope.identified++;
        const [a, b] = [left, right].sort();
        let row = report.rows.find(r => r.a === a && r.b === b);
        if (!row) { row = { a, b, records: [emptyRecord(), emptyRecord()] }; report.rows.push(row); }
        // Mirrors are omitted from win-rate comparisons: orientation has no champion meaning.
        if (a !== b) addRecord(row.records[period], matchRecord(match.winner, left === a ? match.a : match.b));
      }
      if (period === 1) for (const [id, own, opponent] of [[match.a, left, right], [match.b, right, left]] as const) {
        const row = playerFormat(id, format), record = matchRecord(match.winner, id);
        seenPlayers.add(id); addRecord(row.record, record);
        const build = own ? buildFor(`${bundle.id}:${id}`) : undefined;
        const name = build?.name ?? 'Unclassified';
        let buildRow = row.builds.find(b => b.name === name && b.champion === own && b.href === (build ? `/archetypes/${build.id}` : undefined));
        if (!buildRow) { buildRow = { name, champion: own, href: build ? `/archetypes/${build.id}` : undefined, record: emptyRecord() }; row.builds.push(buildRow); }
        addRecord(buildRow.record, record);
        if (!opponent) row.unidentifiedOpponents++;
        else { let opponentRow = row.opponents.find(o => o.name === opponent); if (!opponentRow) { opponentRow = { name: opponent, record: emptyRecord() }; row.opponents.push(opponentRow); } addRecord(opponentRow.record, record); }
      }
    }
    for (const id of seenPlayers) playerFormat(id, format).events++;
    battle.set(format, report);
    if (period !== 1 || !bundle.event.host.id || bundle.event.setting !== 'physical') continue;
    const hostId = bundle.event.host.id;
    const place = places.get(hostId) ?? { hostId, formats: [] };
    let row = place.formats.find(f => f.format === format);
    if (!row) { row = { format, events: 0, rosterEvents: 0, entries: 0, people: 0, returning: 0, attendance: [], fieldEvents: 0, fieldEntries: 0, champions: [] }; place.formats.push(row); }
    row.events++;
    const roster = new Set(bundle.players.map(p => p.id));
    if (roster.size && roster.size === bundle.players.length && bundle.event.players.length > 0 && new Set(bundle.event.players).size === roster.size && bundle.event.players.every(id => roster.has(id))) {
      row.rosterEvents++; row.entries += roster.size;
      row.attendance.push({ eventId: bundle.id, date, count: roster.size });
      const key = JSON.stringify([hostId, format]), counts = placePeople.get(key) ?? new Map<number, number>();
      for (const id of roster) counts.set(id, (counts.get(id) ?? 0) + 1);
      placePeople.set(key, counts);
    }
    const field = eventField(bundle, signatures, catalog);
    if (field) { row.fieldEvents++; row.fieldEntries += field.entrants; for (const c of field.champions) { let item = row.champions.find(x => x.name === c.name); if (!item) { item = { name: c.name, count: 0, events: 0 }; row.champions.push(item); } item.count += c.count; item.events++; } }
    places.set(hostId, place);
  }
  const lists = new Map(index.decks.map(d => [d.deckId, d]));
  const eligibleEvents = new Map(individual.filter(b => b.event.date.slice(0, 10) >= from).map(b => [b.id, b]));
  for (const entry of new Map(entries.map(e => [e.deckId, e])).values()) {
    const event = eligibleEvents.get(entry.eventId); if (!event) continue;
    const row = playerFormat(entry.player, event.event.format);
    row.evolution.push({ deckId: entry.deckId, eventId: entry.eventId, date: event.event.date.slice(0, 10), champion: entry.championName, build: buildFor(entry.deckId)?.name ?? 'Unclassified' });
  }
  for (const player of players.values()) for (const row of player.formats) {
    row.evolution.sort((a, b) => b.date.localeCompare(a.date) || b.eventId - a.eventId); row.evolution = row.evolution.slice(0, 2).reverse();
    if (row.evolution.length !== 2) continue;
    const decks = row.evolution.map(e => lists.get(e.deckId));
    if (decks.some(d => !d || ![d.main, d.material].every(s => s.length && decodeCardLines(s, index.cardNames).every(c => c.name && Number.isInteger(c.quantity) && c.quantity > 0)))) continue;
    row.changes = [];
    for (const section of ['main', 'material'] as const) {
      const counts = decks.map(d => { const map = new Map<string, number>(); for (const c of decodeCardLines(d![section], index.cardNames)) map.set(c.name, (map.get(c.name) ?? 0) + c.quantity); return map; });
      for (const name of new Set(counts.flatMap(c => [...c.keys()]))) { const before = counts[0].get(name) ?? 0, after = counts[1].get(name) ?? 0; if (before !== after) row.changes.push({ name, section, before, after }); }
    }
  }
  for (const place of places.values()) for (const row of place.formats) { const counts = placePeople.get(JSON.stringify([place.hostId, row.format])); row.people = counts?.size ?? 0; row.returning = [...(counts?.values() ?? [])].filter(n => n > 1).length; row.attendance.sort((a, b) => a.date.localeCompare(b.date) || a.eventId - b.eventId); }
  // Team membership is event-specific. Never substitute a player's historical favorite.
  for (const bundle of completed) {
    if (!Array.isArray(bundle.teams) || !bundle.teams.length) continue;
    const signatures = ctx.getEventSignatures(bundle);
    for (const team of bundle.teams) {
      const players = team.players.map(p => { const raw = 'error' in bundle.decklists ? [] : bundle.decklists.filter(d => d.player === p.id); const sig = signatures.get(p.id); return { id: p.id, champion: raw.length === 1 && raw[0].visible !== false && [raw[0].decklist.main, raw[0].decklist.material].every(section => section.length && section.every(c => Number.isInteger(c.quantity) && c.quantity > 0)) && sig && !sig.unmatchedCardNames.length ? sig.championName : null }; });
      const standings = 'error' in bundle.standings ? [] : bundle.standings.standings.filter(s => s.name === team.name);
      const standing = standings.length === 1 && bundle.teams.filter(t => t.name === team.name).length === 1 ? standings[0] : undefined;
      const record = standing && [standing.statsWins, standing.statsLosses, standing.statsTies, standing.statsByes].every(n => Number.isInteger(n) && n >= 0) ? { wins: standing.statsWins, losses: standing.statsLosses, ties: standing.statsTies } : null;
      teams.push({ eventId: bundle.id, teamName: team.name, players, record, distinct: players.length === 3 && new Set(players.map(p => p.id)).size === 3 && players.every(p => p.champion) ? new Set(players.map(p => p.champion)).size : null });
    }
  }
  for (const [name, rows] of [['seasons', season], ['battle', [...battle.values()]], ['players', [...players.values()]], ['places', [...places.values()]], ['teams', teams]] as const) await writeJsonAtomic(path.join(directory, `competition-${name}.json`), { generatedAt, from, to, rows }, 0);
}
