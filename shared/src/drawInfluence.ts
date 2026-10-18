/** A bounded draw-only policy, not a full game simulation. */
export interface InfluenceDrawSource {
  name: string;
  quantity: number;
  draws: number;
  reserve: number | null;
  memory?: number | null;
  level?: number | null;
  discard: number;
}

export function estimateDrawInfluence(main: InfluenceDrawSource[], material: InfluenceDrawSource[], opening: number, order: 'first' | 'second', turns = 5, samples = 512) {
  const deck = main.flatMap((source) => Array.from({ length: Math.max(0, Math.floor(source.quantity)) }, () => source));
  const totals = Array.from({ length: turns }, () => ({ seen: 0, hand: 0, memory: 0, influence: 0 }));
  let seed = 1739;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let sample = 0; sample < samples; sample++) {
    const library = [...deck];
    for (let i = library.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [library[i], library[j]] = [library[j], library[i]]; }
    let seen = 0;
    let hand: InfluenceDrawSource[] = [];
    let memory: InfluenceDrawSource[] = [];
    const available = material.flatMap((source) => Array.from({ length: source.quantity }, () => source));
    const draw = (count: number) => { for (let i = 0; i < count && seen < library.length; i++) hand.push(library[seen++]); };
    // Preserve draw engines when selecting payment/discard cards; stable order breaks ties.
    const take = (zone: InfluenceDrawSource[], count: number) => {
      zone.sort((a, b) => a.draws - b.draws);
      return zone.splice(0, count);
    };
    draw(opening);
    for (let turn = 1; turn <= turns; turn++) {
      // One materialization before recollection, with actual memory payment.
      if (turn > 1) {
        const index = available.findIndex((source) => source.draws > 0 && source.memory != null && source.memory <= memory.length && (source.level ?? 0) < turn);
        if (index >= 0) {
          const [source] = available.splice(index, 1);
          take(memory, source.memory!);
          draw(source.draws);
          take(hand, source.discard);
        }
      }
      hand.push(...memory); memory = [];
      if (turn > 1 || order === 'second') draw(1);
      // Each physical copy resolves once; newly drawn engines can be played if payable.
      while (true) {
        const index = hand.findIndex((source) => source.draws > 0 && source.reserve != null && source.reserve >= 0 && source.reserve <= hand.length - 1);
        if (index < 0) break;
        const [source] = hand.splice(index, 1);
        memory.push(...take(hand, source.reserve!));
        draw(source.draws);
        take(hand, source.discard);
      }
      totals[turn - 1].seen += seen / samples;
      totals[turn - 1].hand += hand.length / samples;
      totals[turn - 1].memory += memory.length / samples;
      totals[turn - 1].influence += (hand.length + memory.length) / samples;
    }
  }
  return totals;
}
