import type { Card } from '@gatcg/shared';
import type { AnalysisPlan } from '../../lib/analysisProfile';
import { recipeAccessBreakdown, selectedRecipeOdds, type CalculatorLine } from '../../lib/calculatorDashboard';
import { naturalCardsSeenByTurn } from '../../lib/turnToPlay';
import Button from '../../components/ui/Button';
import DisclosureChevron from '../../components/DisclosureChevron';
import CalculatorCardContext from './CalculatorCardContext';
import type { AnalysisScenario } from './AccessTimeline';

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
export default function PlanCheck({ main, catalog, plan, opening, scenario, onEditPlan, needsReview = false }: {
  main: CalculatorLine[]; catalog: Map<string, Card>; plan: AnalysisPlan | null; opening: number;
  scenario: AnalysisScenario; onEditPlan: () => void; needsReview?: boolean;
}) {
  const size = main.reduce((sum, line) => sum + line.quantity, 0);
  const groups = ['enabler', 'payoff'].map((role) => main.filter((line) => line.quantity > 0 && plan?.roles[line.name] === role).map((line) => line.name));
  const ready = size > 0 && groups.every((group) => group.length > 0);
  const at = (turn: number, order = scenario.order) => selectedRecipeOdds(main, groups, Math.min(size, naturalCardsSeenByTurn(turn, opening, order))) ?? 0;
  const both = ready ? at(scenario.turn) : 0;
  const seen = Math.min(size, naturalCardsSeenByTurn(scenario.turn, opening, scenario.order));
  const breakdown = recipeAccessBreakdown(main, groups, seen);
  const protection = main.filter((line) => plan?.roles[line.name] === 'protection').map((line) => line.name);
  const missing = [
    ['Missing setup only', breakdown?.missingFirst ?? 0],
    ['Missing payoff only', breakdown?.missingSecond ?? 0],
    ['Missing both', breakdown?.missingBoth ?? 0],
  ] as const;
  return <div className="space-y-3" aria-label="Guided plan check">
    <p className="text-sm font-semibold">{plan?.name ?? 'Your plan'} · setup + payoff</p>
    <div className="grid gap-3 sm:grid-cols-2">{groups.map((group, index) => <div key={index} className="min-w-0 rounded-xl bg-ctp-base/50 p-3"><h3 className="mb-2 text-sm font-medium">{index === 0 ? 'Setup cards' : 'Payoff cards'} · any one</h3>{group.length ? <CalculatorCardContext names={group} catalog={catalog} /> : <p className="text-sm text-ctp-subtext1">Choose {index === 0 ? 'what enables your plan' : 'what your plan builds toward'}.</p>}</div>)}</div>
    {groups.flat().some((name) => !catalog.has(name)) && <p role="status" className="text-sm text-ctp-yellow">Some plan cards are missing catalog data. Access uses listed quantities; card effects and costs are not evaluated.</p>}
    {needsReview && <p role="status" className="text-sm text-ctp-yellow">Review the saved role assignments for this deck. These estimates use the assignments shown above.</p>}
    {!size ? <p>Add Main Deck cards to check your plan.</p> : !ready ? <p className="text-sm">Choose {groups[0].length ? 'payoff cards' : groups[1].length ? 'setup cards' : 'setup and payoff cards'} to calculate access. Your deck size and opening hand are already filled in.</p> : <>
      <p className="text-4xl font-bold tabular-nums text-ctp-blue">{percent(both)}</p>
      <p className="text-sm">About {(both * 10).toFixed(1)} in 10 random draws contain at least one setup and one payoff by turn {scenario.turn}, going {scenario.order}.</p>
      <p className="text-xs text-ctp-subtext1">{seen} cards seen from {size}, including {opening} opening cards. Calculated access only: no mulligans, searches, extra draws, payment, or play sequence. This is not recorded game performance.</p>
      {protection.length > 0 && <p className="text-sm">With at least one saved protection card too: {percent(selectedRecipeOdds(main, [...groups, protection], seen) ?? 0)}</p>}
      <details className="group"><summary className="flex min-h-12 cursor-pointer items-center justify-between gap-2 text-sm">What is missing when I miss?<DisclosureChevron className="group-open:rotate-180" /></summary><p className="text-xs text-ctp-subtext1">Share of all random draws at this deadline, not just unsuccessful draws.</p><dl className="mt-2 grid gap-2 sm:grid-cols-3">{missing.map(([label, value]) => <div key={label} className="rounded-lg bg-ctp-base/50 p-3"><dt className="text-xs">{label}</dt><dd className="mt-1 text-lg font-semibold">{percent(Math.max(0, value))}</dd></div>)}</dl></details>
      <details className="group"><summary className="flex min-h-12 cursor-pointer items-center justify-between gap-2 text-sm">What if I change the deadline or play order?<DisclosureChevron className="group-open:rotate-180" /></summary><p className="text-xs text-ctp-subtext1">Preview with the same deck and roles. Your current scenario stays unchanged.</p><dl className="mt-2 grid gap-2 sm:grid-cols-2">{scenario.turn < 8 && <div className="rounded-lg bg-ctp-base/50 p-3"><dt className="text-xs">Turn {scenario.turn + 1} · going {scenario.order}</dt><dd className="text-lg font-semibold">{percent(at(scenario.turn + 1))}</dd></div>}<div className="rounded-lg bg-ctp-base/50 p-3"><dt className="text-xs">Turn {scenario.turn} · going {scenario.order === 'first' ? 'second' : 'first'}</dt><dd className="text-lg font-semibold">{percent(at(scenario.turn, scenario.order === 'first' ? 'second' : 'first'))}</dd></div></dl></details>
    </>}
    <Button onClick={onEditPlan}>{ready ? 'Review plan cards' : 'Choose plan cards'}</Button>
  </div>;
}
