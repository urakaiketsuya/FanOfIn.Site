export interface FixedDrawStep { count: number; destination: 'hand' | 'memory' }

/** Printed fixed draw clauses in order; does not establish activation permission. */
export function fixedDrawSteps(effect: string): FixedDrawStep[] {
  const words: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 };
  return [...effect.matchAll(/\bdraw\s+(a|an|one|two|three|four|five|six|seven|\d+)\s+cards?\b(?:\s+into\s+(?:your\s+)?(hand|memory))?/gi)]
    .map(match => ({ count: words[match[1].toLowerCase()] ?? Number(match[1]), destination: match[2]?.toLowerCase() === 'memory' ? 'memory' : 'hand' }));
}

/** Conservative automatic model: only complete, fixed draw-only Action text.
 * Other printed draw effects remain discoverable but require rules we do not simulate.
 */
export function supportedDrawEffect(card: { types: string[]; effect?: string | null } | undefined): { steps: FixedDrawStep[]; discard: number } | null {
  if (!card?.types.includes('ACTION')) return null;
  const text = (card.effect ?? '').trim();
  const quantity = '(?:a|an|one|two|three|four|five|six|seven|\\d+)';
  const draw = `draw ${quantity} cards?(?: into (?:your )?(?:hand|memory))?`;
  const normalized = text.replace(/\s+/g, ' ');
  const match = normalized.match(new RegExp(`^(${draw}(?:\\. ${draw})*)(?:,? then discard (${quantity}) cards?)?\\.?$`, 'i'));
  if (!match) return null;
  const words: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 };
  return { steps: fixedDrawSteps(match[1]), discard: match[2] ? words[match[2].toLowerCase()] ?? Number(match[2]) : 0 };
}

/** A bounded draw-only policy, not a full game simulation. */
export interface InfluenceDrawSource {
  name: string;
  quantity: number;
  draws: number;
  drawSteps?: FixedDrawStep[];
  reserve: number | null;
  memory?: number | null;
  level?: number | null;
  discard: number;
}

export function estimateDrawInfluence(main: InfluenceDrawSource[], material: InfluenceDrawSource[], opening: number, order: 'first' | 'second', turns = 5, samples = 512) {
  const deck = main.flatMap((source) => Array.from({ length: Math.max(0, Math.floor(source.quantity)) }, () => source));
  const totals = Array.from({ length: turns }, () => ({ seen: 0, hand: 0, memory: 0, influence: 0, extraAccess: new Map<string, number>() }));
  let seed = 1739;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let sample = 0; sample < samples; sample++) {
    const library = [...deck];
    for (let i = library.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [library[i], library[j]] = [library[j], library[i]]; }
    let seen = 0;
    let hand: InfluenceDrawSource[] = [];
    let memory: InfluenceDrawSource[] = [];
    const available = material.flatMap((source) => Array.from({ length: source.quantity }, () => source));
    const draw = (count: number, destination: 'hand' | 'memory' = 'hand') => {
      const zone = destination === 'memory' ? memory : hand;
      for (let i = 0; i < count && seen < library.length; i++) zone.push(library[seen++]);
    };
    const resolveDraws = (source: InfluenceDrawSource) => {
      for (const step of source.drawSteps ?? [{ count: source.draws, destination: 'hand' }]) draw(step.count, step.destination);
    };
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
          resolveDraws(source);
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
        resolveDraws(source);
        take(hand, source.discard);
      }
      // Couple the modeled and natural draws to the same shuffled library. Only
      // newly accessed names contribute: an engine cannot help find its first copy.
      const naturalCount = Math.min(library.length, opening + turn - (order === 'first' ? 1 : 0));
      const naturalNames = new Set(library.slice(0, naturalCount).map(source => source.name));
      const extraNames = new Set(library.slice(naturalCount, seen).map(source => source.name));
      const access = totals[turn - 1].extraAccess;
      for (const name of extraNames) {
        if (!naturalNames.has(name)) access.set(name, (access.get(name) ?? 0) + 1 / samples);
      }
      totals[turn - 1].seen += seen / samples;
      totals[turn - 1].hand += hand.length / samples;
      totals[turn - 1].memory += memory.length / samples;
      totals[turn - 1].influence += (hand.length + memory.length) / samples;
    }
  }
  return totals;
}
