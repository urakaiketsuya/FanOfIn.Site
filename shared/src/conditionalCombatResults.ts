/** Reviewed outcomes for supplied game states, never inputs to draw forecasts. */
export interface ConditionalCombatResult {
  condition: string;
  outcomes: readonly { label: string; value: string }[];
}
export const CONDITIONAL_COMBAT_RESULTS: Readonly<Record<string, ConditionalCombatResult>> = {
  'Baby Red Slime': {
    condition: 'Class bonus · discard a Fire card on attack',
    outcomes: [{ label: 'This attack', value: '+1 power' }],
  },
  'Ethereal Slime': {
    condition: 'Class bonus · banish a Tamer from Material on entry',
    outcomes: [{ label: 'On itself', value: '+1 buff' }, { label: 'Draw', value: '1 card' }],
  },
  'Forest Cake': {
    condition: 'Class bonus · sacrifice when an Animal / Beast enters',
    outcomes: [{ label: 'Entering ally', value: '+1 buff' }],
  },
  'Lustrous Slime': {
    condition: 'Slimes revealed from memory · no other buffs',
    outcomes: [0, 2, 4].map(count => ({ label: `${count} revealed`, value: `${1 + count} power · ${count} recovery` })),
  },
  'Verdant Scepter': {
    condition: 'One activation · rest and spend 1 refinement',
    outcomes: [{ label: 'Up to 2 Slime allies', value: '+1 buff each' }, { label: 'Draw', value: '1 card' }],
  },
};
