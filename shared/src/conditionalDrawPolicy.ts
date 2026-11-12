import type { InfluenceDrawSource } from './drawInfluence.js';

/** Explicit Rai-compatible draw contracts. Never infer permission from a draw clause. */
export type ConditionalDraw =
  | 'sacrifice-hand' | 'sacrifice-memory' | 'end-enlighten' | 'return-enlighten'
  | 'enlighten' | 'floating-draw' | 'deluge-draw' | 'discard-draw' | 'discard-spell'
  | 'influence-memory' | 'invoker' | 'forecaster' | 'apprentice' | 'wool-brook';

type Contract = Pick<InfluenceDrawSource, 'conditionalDraw' | 'minimumLevel' | 'drawSteps' | 'floatingMemory'>;
const hand = [{ count: 1, destination: 'hand' as const }];
const memory = [{ count: 1, destination: 'memory' as const }];
export const CONDITIONAL_DRAW_CONTRACTS: Readonly<Record<string, Contract>> = {
  'Wool Brook': { conditionalDraw: 'wool-brook', drawSteps: memory },
  'Aenean Ward': { minimumLevel: 3, drawSteps: hand },
  'Rising Tides': { minimumLevel: 3, drawSteps: memory, floatingMemory: 'always' },
  'Aqua Vitae': { conditionalDraw: 'sacrifice-hand' },
  'Misty Whispertail': { conditionalDraw: 'sacrifice-memory' },
  'Nether Dodobird': { conditionalDraw: 'sacrifice-memory' },
  'Mistbound Watcher': { conditionalDraw: 'end-enlighten' },
  'Windrider Mage': { conditionalDraw: 'return-enlighten' },
  'Channel the Wind': { conditionalDraw: 'enlighten', floatingMemory: 'mage' },
  'Sudden Snow': { conditionalDraw: 'floating-draw' },
  'Relic of Sunken Past': { conditionalDraw: 'deluge-draw' },
  'Retold Fortune': { conditionalDraw: 'discard-spell', floatingMemory: 'mage-level-2' },
  'Shizun of the Ash': { conditionalDraw: 'discard-draw' },
  'Spark Link': { drawSteps: memory, floatingMemory: 'level-1' },
  'Increasing Danger': { drawSteps: [...hand, ...memory] },
  'Tempestuous Conviction': { conditionalDraw: 'influence-memory', minimumLevel: 3 },
  'Windrider Invoker': { conditionalDraw: 'invoker' },
  'Winbless Forecaster': { conditionalDraw: 'forecaster' },
  'Imperial Apprentice': { conditionalDraw: 'apprentice', floatingMemory: 'mage' },
  'Mnemonic Charm': { drawSteps: memory },
  'ChannelTech Charm S': { drawSteps: memory },
  'Aenean Flux Generator': { drawSteps: memory },
};
