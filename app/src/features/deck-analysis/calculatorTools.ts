export const calculatorTools = ['Find cards', 'Opening hand', 'Plan consistency', 'Copies needed', 'Swap comparison', 'Unwanted draws', 'Pressure access', 'Recovery access', 'Next draw', 'Level timing', 'Play sequence', 'Resource timing', 'Sideboard comparison'] as const;
export type CalculatorTool = typeof calculatorTools[number];
export const calculatorGroups = ['Draws', 'Game plan', 'Timing', 'Changes'] as const;
export type CalculatorGroup = typeof calculatorGroups[number];
export const calculatorInfo: Record<CalculatorTool, { group: CalculatorGroup; question: string; note: string; model?: string }> = {
  'Find cards': { group: 'Draws', question: 'Will I find the cards I need?', note: 'Natural draw access to any card in your selected pool.', model: 'Combos and draw effects' },
  'Opening hand': { group: 'Draws', question: 'Will my opening have both ingredients?', note: 'One card from each of two separate groups. Access alone does not prove the hand is playable.', model: 'Custom hand requirements' },
  'Unwanted draws': { group: 'Draws', question: 'How often will I draw cards I want to avoid?', note: 'You decide which cards are unwanted in this scenario.', model: 'Duplicate and conditional draws' },
  'Next draw': { group: 'Draws', question: 'What could my next draw be?', note: 'Uses the remaining deck after the removals you record.' },
  'Plan consistency': { group: 'Game plan', question: 'Will I find setup and payoff together?', note: 'Uses your saved role assignments. Access does not prove that the plan can execute.', model: 'Stage quality and affordability' },
  'Pressure access': { group: 'Game plan', question: 'Can I find a pressure card on time?', note: 'Uses saved pressure roles and their earliest useful turns.', model: 'Pressure across turns' },
  'Recovery access': { group: 'Game plan', question: 'Can I find a way to rebuild?', note: 'Uses your saved rebuild roles. The opponent and board state are not simulated.', model: 'Disruption and recovery' },
  'Level timing': { group: 'Timing', question: 'Can I access a faster level route?', note: 'Shows the strongest supported route, not the combined chance of all routes. Payment and lineage still matter.', model: 'Routes and follow-up resources' },
  'Play sequence': { group: 'Timing', question: 'Can I draw and pay for this sequence?', note: 'A bounded hand resource model for up to four plays. Other spending and Floating Memory relief are excluded.' },
  'Resource timing': { group: 'Timing', question: 'How do costs shape my early turns?', note: 'Printed costs provide a baseline. Only use reduced costs when their conditions are expected to hold.' },
  'Copies needed': { group: 'Changes', question: 'How many matching copies would I need?', note: 'Holds deck size fixed. Matching copies can span interchangeable cards; per-card legality is not enforced.' },
  'Swap comparison': { group: 'Changes', question: 'What changes if I swap these cards?', note: 'A preview only. Saved roles stay fixed and your deck is not edited.' },
  'Sideboard comparison': { group: 'Changes', question: 'What does my sideboard change?', note: 'Preview sideboard substitutions and inspect matchup evidence without changing your saved deck.' },
};

/** Question-first navigation; detailed tools remain available without changing their inputs. */
export const calculatorJourneys: { question: string; tools: CalculatorTool[] }[] = [
  { question: 'Will my deck do its thing?', tools: ['Plan consistency', 'Opening hand', 'Find cards'] },
  { question: 'When can I use these cards?', tools: ['Find cards', 'Resource timing', 'Level timing', 'Play sequence', 'Next draw'] },
  { question: 'What should I change?', tools: ['Copies needed', 'Unwanted draws', 'Swap comparison'] },
  { question: 'Can I handle this matchup?', tools: ['Pressure access', 'Recovery access', 'Sideboard comparison'] },
];
