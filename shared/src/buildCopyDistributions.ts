import type { ArchetypeCluster, DeckCardIndexData } from './analysis-types.js';
import { observedLists } from './observedCardChoices.js';

/** Section-specific observed copies, including absence; missing sections are not zero copies. */
export function buildCopyDistributions(builds: readonly Pick<ArchetypeCluster, 'id' | 'name' | 'deckIds'>[], partitions: readonly DeckCardIndexData[]) {
  const lists = observedLists(partitions);
  return (['main', 'material'] as const).map(section => {
    const populations = builds.map(build => {
      const ids = new Set(build.deckIds);
      const members = [...ids].flatMap(id => {
        const deck = lists.get(id);
        return deck?.[section].length ? [new Map(deck[section].map(line => [line.name, line.quantity]))] : [];
      });
      return { id: build.id, name: build.name, requested: ids.size, available: members.length, members };
    });
    const names = new Set(populations.flatMap(p => p.members.flatMap(m => [...m.keys()])));
    const rows = [...names].map(name => {
      const quantities = [...new Set([...(section === 'main' ? [0,1,2,3,4] : [0,1]), ...populations.flatMap(p => p.members.map(m => m.get(name) ?? 0))])].sort((a,b) => a-b);
      const values = populations.map(p => {
        const counts = new Map<number, number>();
        for (const member of p.members) { const q = member.get(name) ?? 0; counts.set(q, (counts.get(q) ?? 0)+1); }
        return { available: p.available, playing: p.available - (counts.get(0) ?? 0), buckets: quantities.map(quantity => ({ quantity, count: counts.get(quantity) ?? 0, share: p.available ? (counts.get(quantity) ?? 0)/p.available : null })) };
      });
      let difference = 0;
      for (let i=0; i<values.length; i++) for (let j=i+1; j<values.length; j++) {
        if (!values[i].available || !values[j].available) continue;
        difference = Math.max(difference, values[i].buckets.reduce((sum,b,k) => sum + Math.abs(b.share! - values[j].buckets[k].share!),0)/2);
      }
      return { name, quantities, values, difference };
    }).sort((a,b) => b.difference-a.difference || a.name.localeCompare(b.name));
    return { section, populations: populations.map(({members: _members, ...p}) => p), rows };
  });
}
