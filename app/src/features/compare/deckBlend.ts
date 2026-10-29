import { shrinkWinRate, type Card, type DeckFormat, type OmnidexDecklist, type DeckPopularityEntry } from '@gatcg/shared';
import { shortHash } from '../../lib/hash';
import { canonicalSignature } from '../popular/popularityAggregation';
import { deckDestinationEligibility } from '../../lib/deckSectionEligibility';
import { getDeckPackageCatalog } from '../deckbuilder/packageGuardrails';
import { sideboardPointCost, validateDeck } from '../deckbuilder/validateDeck';

export type BlendMode = 'balanced' | 'popular' | 'winning';
export interface BlendSource { key: string; label: string; format: DeckFormat; decklist: OmnidexDecklist }
const sections = ['main', 'material', 'sideboard'] as const;
const quantity = (list: OmnidexDecklist, section: typeof sections[number], name: string) => list[section].filter(l => l.card === name).reduce((n, l) => n + l.quantity, 0);
export function blendIdentity(source: BlendSource, cards: Map<string, Card>): string | null {
  const champions = source.decklist.material.filter(l => cards.get(l.card)?.types.includes('CHAMPION')).map(l => l.card).sort();
  if (!champions.length || source.format === 'UNKNOWN') return null;
  return `${source.format}:${champions.join('|')}`;
}
function buildHash(source: BlendSource): string {
  return shortHash(canonicalSignature(source.decklist.main.map(l => ({name:l.card,quantity:l.quantity})), source.decklist.material.map(l => ({name:l.card,quantity:l.quantity}))));
}
export function blendWeight(source: BlendSource, entries: DeckPopularityEntry[], mode: BlendMode): number {
  const hash = buildHash(source);
  const records = [...new Map(entries.filter(e => e.deckHash === hash || e.deckId === source.key).map(e => [e.deckId,e])).values()];
  const games = records.reduce((n,e) => n + e.wins + e.losses + e.ties, 0);
  const wins = records.reduce((n,e) => n + e.wins + e.ties * 0.5, 0);
  const popularity = Math.max(1, records.length);
  const performance = 2 * shrinkWinRate(wins, games, 10).adjustedWinRate;
  return mode === 'popular' ? popularity : mode === 'winning' ? performance : popularity * performance;
}

/** Conservative blend: retain the base lineage and known package members, allocate remaining copies by weighted support. */
export function blendDecks(sources: BlendSource[], baseKey: string, mode: BlendMode, cards: Map<string, Card>, entries: DeckPopularityEntry[] = []) {
  const base = sources.find(s => s.key === baseKey);
  if (!base) throw new Error('Choose a base deck.');
  if (sources.some(source => sections.some(section => source.decklist[section].some(line => !Number.isSafeInteger(line.quantity) || line.quantity < 1)))) throw new Error('Deck quantities must be positive whole numbers.');
  const identity = blendIdentity(base,cards);
  if (!identity) throw new Error('Choose a deck with a known format and Champion lineup.');
  const compatible = sources.filter(s => blendIdentity(s,cards) === identity);
  // Identical full lists count once; tournament entry totals already represent their popularity.
  const unique = [...new Map(compatible.map(s => [JSON.stringify(sections.map(section => [...s.decklist[section]].map(l=>[l.card,l.quantity]).sort())),s])).values()];
  if (unique.length < 2) throw new Error('Choose at least two distinct decks with the same Champion and Spirit lineup.');
  const missing = unique.flatMap(s => sections.flatMap(section => s.decklist[section].filter(l => !cards.has(l.card)).map(l=>l.card)));
  if (missing.length) throw new Error(`Card data unavailable: ${[...new Set(missing)].join(', ')}.`);
  const weights = unique.map(s => blendWeight(s,entries,mode) / unique.filter(other => buildHash(other) === buildHash(s)).length);
  const weightSum = weights.reduce((a,b)=>a+b,0);
  const packageMembers = new Set(unique.flatMap(s => getDeckPackageCatalog(sections.flatMap(section=>s.decklist[section].map(l=>({cardName:l.card,quantity:l.quantity,section})))).flatMap(p=>p.memberCards)));
  const result: OmnidexDecklist = { main:[], material:base.decklist.material.map(l=>({card:l.card,quantity:l.quantity})), sideboard:[] };
  const elements = new Set(base.decklist.material.flatMap(l=>cards.get(l.card)?.types.includes('CHAMPION') ? cards.get(l.card)!.elements : []).filter(e=>e!=='NORM'));
  const totalFor = (name: string) => sections.reduce((n,section)=>n+quantity(result,section,name),0);
  // Reserve both sections' core/package copies before allocating across the shared copy limit.
  for (const section of ['main','sideboard'] as const) {
    const names = [...new Set(unique.flatMap(s=>s.decklist[section].map(l=>l.card)))].sort();
    const fixed = new Set(names.filter(name=>packageMembers.has(name)));
    for (const name of names) {
      const shared = Math.min(...unique.map(s=>quantity(s.decklist,section,name)));
      const q = fixed.has(name) ? quantity(base.decklist,section,name) : shared;
      if (q) result[section].push({card:name,quantity:q});
    }
  }
  for (const section of ['main','sideboard'] as const) {
    const target = base.decklist[section].reduce((n,l)=>n+l.quantity,0);
    const names = [...new Set(unique.flatMap(s=>s.decklist[section].map(l=>l.card)))].sort();
    const fixed = new Set(names.filter(name=>packageMembers.has(name)));
    const size = () => result[section].reduce((n,l)=>n+l.quantity,0);
    const candidates = names.flatMap(name => {
      if (fixed.has(name)) return [];
      const card = cards.get(name)!;
      if (!deckDestinationEligibility(card,section).allowed || (card.elements.length && !card.elements.some(e=>e==='NORM'||elements.has(e)))) return [];
      const max = Math.min(card.legality?.[base.format]?.limit ?? (base.format==='PANTHEON'?1:4), Math.max(...unique.map(s=>quantity(s.decklist,section,name))));
      const expected = unique.reduce((n,s,j)=>n+quantity(s.decklist,section,name)*weights[j],0)/weightSum;
      // Marginal reduction in squared distance to the weighted copy target.
      return Array.from({length:Math.max(0,max)},(_,i)=>({name,copy:i+1,score:expected-i-0.5}));
    }).sort((a,b)=>b.score-a.score || quantity(base.decklist,section,b.name)-quantity(base.decklist,section,a.name) || a.name.localeCompare(b.name) || a.copy-b.copy);
    for (const candidate of candidates) {
      if (size()>=target) break;
      const {name,copy} = candidate;
      const card=cards.get(name)!;
      if (quantity(result,section,name)>=copy || totalFor(name)>=(card.legality?.[base.format]?.limit??(base.format==='PANTHEON'?1:4))) continue;
      if (section==='sideboard' && result.sideboard.reduce((n,l)=>n+l.quantity*sideboardPointCost(cards.get(l.card)),0)+sideboardPointCost(card)>15) continue;
      const line=result[section].find(l=>l.card===name);
      if(line) line.quantity++; else result[section].push({card:name,quantity:1});
    }
  }
  const validation = validateDeck({main:result.main.map(l=>({cardName:l.card,quantity:l.quantity})),material:result.material.map(l=>({cardName:l.card,quantity:l.quantity})),sideboard:result.sideboard.map(l=>({cardName:l.card,quantity:l.quantity}))},cards,elements,base.format);
  const routing = sections.flatMap(section=>result[section].flatMap(l=>deckDestinationEligibility(cards.get(l.card),section).allowed?[]:[`${l.card}: wrong section (${section}).`]));
  const reasons = [...routing,...validation.reasons];
  for(const section of ['main','sideboard'] as const) if(result[section].reduce((n,l)=>n+l.quantity,0)!==base.decklist[section].reduce((n,l)=>n+l.quantity,0)) reasons.push(`${section==='main'?'Main':'Sideboard'} could not reach the base deck's size.`);
  return {decklist:result, included:unique.length, excluded:sources.length-compatible.length, format:base.format, reasons, status:routing.length?'Illegal':validation.status==='Legal'&&reasons.length?'Incomplete':validation.status};
}
