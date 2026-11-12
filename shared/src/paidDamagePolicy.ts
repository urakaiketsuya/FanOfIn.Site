/** Reviewed effects for the Rai Fire fixture, not a general rules-text parser. */
export type PaidDamageEffect = 'fireball' | 'gilded-pyre' | 'focused-flames' | 'ignite-fate'
  | 'ignite-soul' | 'innervate-fury' | 'intensified-pyre' | 'purge-flames' | 'pyroclastic-flow' | 'set-ablaze';

/** Target opportunities per cast; these are output scenarios, not opponent simulations. */
export interface PaidDamageScenario {
  allies: 0 | 1 | 2;
  target: 'champion' | 'ally';
  buffed?: boolean;
  opposingGraveyard?: number;
  startingDamage?: number;
}

export const CHAMPION_DAMAGE_SCENARIO: PaidDamageScenario = { allies: 0, target: 'champion' };

export function needsAlly(effect: PaidDamageEffect | undefined) {
  return effect === 'focused-flames' || effect === 'innervate-fury' || effect === 'set-ablaze';
}

export function paidDamageDiscount(effect: PaidDamageEffect | undefined, level: number) {
  if (effect === 'purge-flames') return level;
  if (level < 1) return 0;
  return effect === 'fireball' ? 2 : effect === 'focused-flames' ? 1 : 0;
}

export function paidDamageOutput(effect: PaidDamageEffect, level: number, scenario: PaidDamageScenario) {
  let champion = 0, allies = 0, self = 0, ownAllies = 0;
  const unit = (amount: number) => {
    if (scenario.target === 'ally' && scenario.allies > 0) allies += amount;
    else champion += amount;
  };
  switch (effect) {
    case 'fireball': unit(1 + level); break;
    case 'gilded-pyre': unit(scenario.buffed ? 4 : 2); break;
    case 'ignite-soul': unit(1); break;
    case 'focused-flames': if (scenario.allies) allies = 4; break;
    case 'ignite-fate': champion = self = 2; break;
    case 'innervate-fury': if (scenario.allies) allies = 7; break; // Seven total, not seven per target.
    case 'intensified-pyre': champion = (scenario.opposingGraveyard ?? 0) >= 8 ? 6 : 2; break;
    case 'purge-flames':
      champion = ownAllies = level >= 1 ? 3 : 2;
      allies = champion * scenario.allies;
      break;
    case 'pyroclastic-flow': champion = self = ownAllies = 2; allies = 2 * scenario.allies; break;
    case 'set-ablaze':
      if (scenario.allies) { allies = 4; champion = level >= 3 ? 3 : 0; }
      break;
  }
  return { champion, allies, self, ownAllies };
}
