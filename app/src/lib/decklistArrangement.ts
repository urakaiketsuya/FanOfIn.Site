import { setFamily, type Card, type OmnidexDecklistCardLine } from '@gatcg/shared';

export const DECK_GROUPS = { location: 'Deck location', set: 'Set', element: 'Element', type: 'Card type', none: 'No groups' } as const;
export const DECK_SORTS = { original: 'Deck order', name: 'Name A–Z', cost: 'Cost: low to high', quantity: 'Quantity: high to low', priceAsc: 'Unit price: low to high', priceDesc: 'Unit price: high to low' } as const;
export type DeckGrouping = keyof typeof DECK_GROUPS;
export type DeckSorting = keyof typeof DECK_SORTS;
export type DisplayDeckLine = OmnidexDecklistCardLine & { location?: string; displayKey?: string };
export type DisplayDeckSection = { title: string; lines: DisplayDeckLine[] };

/** Display-only regrouping: preserve locations, allocations and total copies. Tokens stay separate. */
export function arrangeDeckSections(sections: DisplayDeckSection[], cards: Map<string, Card>, prices: Map<string, number>, grouping: DeckGrouping, sorting: DeckSorting): DisplayDeckSection[] {
  const numeric = (line: DisplayDeckLine): number | undefined => {
    if (sorting === 'quantity') return line.quantity;
    if (sorting === 'cost') { const value = cards.get(line.card)?.cost.value; return value != null && value.trim() !== '' && Number.isFinite(Number(value)) ? Number(value) : undefined; }
    return prices.get(line.card);
  };
  const sort = (lines: DisplayDeckLine[]) => sorting === 'original' ? lines : [...lines].sort((a, b) => {
    if (sorting === 'name') return a.card.localeCompare(b.card);
    const av = numeric(a), bv = numeric(b);
    if (av === undefined || bv === undefined) return av === bv ? a.card.localeCompare(b.card) : av === undefined ? 1 : -1;
    return (av - bv) * (sorting === 'quantity' || sorting === 'priceDesc' ? -1 : 1) || a.card.localeCompare(b.card);
  });
  if (grouping === 'location') return sections.map(section => ({ ...section, lines: sort(section.lines) }));
  const groups = new Map<string, DisplayDeckLine[]>();
  for (const section of sections.filter(section => section.title !== 'Tokens')) {
    section.lines.forEach((line, index) => {
      const card = cards.get(line.card);
      // Explicit printings use their actual set; unspecified copies use the earliest catalog release.
      const allocations = grouping === 'set' ? [
        ...(line.printings ?? []).map(printing => ({ ...line, quantity: printing.quantity, printings: [printing] })),
        ...(line.quantity > (line.printings ?? []).reduce((sum, p) => sum + p.quantity, 0) ? [{ ...line, quantity: line.quantity - (line.printings ?? []).reduce((sum, p) => sum + p.quantity, 0), printings: undefined }] : []),
      ] : [line];
      allocations.forEach((row, allocation) => {
        const edition = row.printings?.[0] ? card?.editions.find(e => e.uuid === row.printings![0].editionUuid) : [...(card?.editions ?? [])].sort((a, b) => (a.set.release_date || "9999").localeCompare(b.set.release_date || "9999") || a.set.prefix.localeCompare(b.set.prefix))[0];
        const title = grouping === 'none' ? 'Cards' : grouping === 'set' ? edition ? setFamily(edition.set).name : 'Unknown set' : grouping === 'element' ? card?.element ?? 'Unknown element' : card?.types.join(' / ') || 'Unknown type';
        const rows = groups.get(title) ?? [];
        rows.push({ ...row, location: section.title, displayKey: `${section.title}:${index}:${allocation}` });
        groups.set(title, rows);
      });
    });
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([title, lines]) => ({ title, lines: sort(lines) })).concat(sections.filter(s => s.title === 'Tokens').map(s => ({ ...s, lines: sort(s.lines) })));
}
