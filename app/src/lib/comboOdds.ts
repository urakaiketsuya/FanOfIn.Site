export interface ConditionalComboOdds {
  anchorCopies: number;
  optionCopies: number;
  probability: number;
  seen: number;
}

function probabilityOfNoHits(deckSize: number, hits: number, seen: number): number {
  if (hits <= 0) return 1;
  if (seen > deckSize - hits) return 0;
  let probability = 1;
  for (let draw = 0; draw < seen; draw++) probability *= (deckSize - hits - draw) / (deckSize - draw);
  return probability;
}

/** Exact without-replacement chance of seeing anchor A and at least one card from option group B. */
export function conditionalComboOdds(deckSize: number, anchorCopies: number, optionCopies: number, seen: number): ConditionalComboOdds {
  const draws = Math.max(0, Math.min(seen, deckSize));
  const anchors = Math.max(0, Math.min(anchorCopies, deckSize));
  const options = Math.max(0, Math.min(optionCopies, deckSize - anchors));
  const probability = anchors === 0 || options === 0 ? 0 : 1
    - probabilityOfNoHits(deckSize, anchors, draws)
    - probabilityOfNoHits(deckSize, options, draws)
    + probabilityOfNoHits(deckSize, anchors + options, draws);
  return { anchorCopies: anchors, optionCopies: options, probability: Math.max(0, Math.min(1, probability)), seen: draws };
}
