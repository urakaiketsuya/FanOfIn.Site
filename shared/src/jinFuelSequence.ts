import type { InfluenceDrawSource } from './drawInfluence.js';

export type JinFuelRole = 'crescendo' | 'courier' | 'messenger' | 'songstress' | 'curator' | 'dungeon' | 'liminal' | 'loot' | 'ignite';
export interface JinFuelCheckpoint {
  turn: number;
  fuel: number;
  casts: number;
  maxFuel: number;
  harmonized: number;
  damage: number;
  discardedFire: number;
}
export interface JinFuelOptions {
  /** Once per turn from the turn after entry, without opponent removal. */
  messengerAttacks: boolean;
  maximumLevel?: number;
  checkpoint: (point: JinFuelCheckpoint) => void;
}
type Source = InfluenceDrawSource;
interface Zones {
  hand: () => Source[];
  memory: () => Source[];
  graveyard: Source[];
  banished: Source[];
  field: Source[];
  level: () => number;
  levelUp: () => void;
  draw: (count: number) => void;
  random: () => number;
  scavenge: (subtype: string) => void;
  damage: (amount: number) => void;
}

/** Opt-in Crescendo core-engine policy; the shared runner owns all physical zones and payments. */
export function createJinFuelSequence(zones: Zones, options: JinFuelOptions) {
  let melody = false, casts = 0, maxFuel = 0, harmonized = 0, damage = 0, discardedFire = 0;
  const fuel = () => zones.graveyard.filter(card => card.fireElement).length;
  const priority = (card: Source) => {
    switch (card.jinFuelRole) {
      case 'songstress': return 0;
      case 'loot': return 1;
      case 'courier': return 2;
      case 'messenger': return 3;
      case 'curator': return 4;
      case 'dungeon': return 5;
      case 'ignite': return 7;
      case 'crescendo': return 6;
      default: return 8;
    }
  };
  const rank = (zone: Source[], discarding: boolean) => {
    const hand = zones.hand();
    // Preserve one payoff and one of each engine; surplus copies remain usable fuel.
    const keep = new Set<Source>();
    for (const role of ['crescendo', 'songstress', 'loot', 'courier', 'messenger', 'curator'] as const) {
      const copy = hand.find(card => card.jinFuelRole === role);
      if (copy) keep.add(copy);
    }
    const score = (card: Source) => {
      if (!discarding) return (keep.has(card) ? 100 : 0) + (card.fireElement ? 10 : 0);
      // Liminal can return on the next paid level; otherwise prioritize spare Fire.
      return (keep.has(card) ? 100 : 0) + (card.fireElement ? 0 : card.jinFuelRole === 'liminal' && zones.level() < (options.maximumLevel ?? 3) ? 5 : 20);
    };
    zone.sort((a, b) => score(a) - score(b));
  };
  const discard = (count: number) => {
    const hand = zones.hand();
    rank(hand, true);
    const cards = hand.splice(0, count);
    discardedFire += cards.filter(card => card.fireElement).length;
    zones.graveyard.push(...cards);
    return cards.length;
  };
  const loot = () => { if (discard(1)) zones.draw(1); };
  const onLevel = () => {
    for (const card of zones.graveyard.slice()) if (card.jinFuelRole === 'liminal') {
      zones.graveyard.splice(zones.graveyard.indexOf(card), 1);
      zones.field.push(card);
      zones.draw(1);
      // No field removal is simulated in this policy, so ephemeral never changes its zone.
    }
  };
  return {
    rank, discard, priority, onLevel,
    beginTurn() { melody = false; },
    beforePlays() {
      // Called before new allies enter: no attack on the turn Messenger is played.
      if (options.messengerAttacks) for (const card of zones.field.slice()) {
        if (card.jinFuelRole === 'messenger') loot();
      }
    },
    canPlay(card: Source) {
      if (card.jinFuelRole === 'liminal') return false;
      if (card.jinFuelRole === 'crescendo') return fuel() >= 3;
      if (card.jinFuelRole === 'dungeon') return zones.level() < (options.maximumLevel ?? 3);
      return Boolean(card.jinFuelRole);
    },
    activate(card: Source) {
      if (card.subtypes?.some(type => type === 'HARMONY' || type === 'MELODY')) {
        // Existing Songstresses trigger before resolution; a new Songstress cannot trigger itself.
        for (const permanent of zones.field.slice()) if (permanent.jinFuelRole === 'songstress') loot();
      }
    },
    resolve(card: Source) {
      switch (card.jinFuelRole) {
        case 'courier': loot(); break;
        case 'curator':
          zones.scavenge(zones.hand().some(source => source.jinFuelRole === 'crescendo') ? 'MELODY' : 'HARMONY');
          break;
        case 'dungeon':
          if (zones.level() < (options.maximumLevel ?? 3) && zones.memory().length >= 2) {
            for (let n = 0; n < 2; n++) zones.banished.push(...zones.memory().splice(Math.floor(zones.random() * zones.memory().length), 1));
            zones.levelUp(); onLevel();
          }
          break;
        case 'crescendo': {
          // The resolving source is still outside the graveyard and cannot fuel itself.
          const spent = fuel();
          for (let n = zones.graveyard.length - 1; n >= 0; n--) {
            if (zones.graveyard[n].fireElement) zones.banished.push(...zones.graveyard.splice(n, 1));
          }
          casts++; maxFuel = Math.max(maxFuel, spent);
          if (melody) { harmonized++; damage += spent; zones.damage(spent); }
          break;
        }
      }
      if (card.subtypes?.includes('MELODY')) melody = true;
    },
    checkpoint(turn: number) { options.checkpoint({ turn, fuel: fuel(), casts, maxFuel, harmonized, damage, discardedFire }); },
  };
}
