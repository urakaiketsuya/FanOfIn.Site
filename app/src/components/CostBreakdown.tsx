import { evaluateCardCost, parseCostModifierRules, type Card } from "@gatcg/shared";

export default function CostBreakdown({ card, effectiveCost, compact = false }: { card: Card; effectiveCost?: number; compact?: boolean }) {
  if (card.cost_reserve == null) return null;
  const rules = parseCostModifierRules(card);
  const chosen = Number.isFinite(effectiveCost) ? Math.max(0, Math.floor(effectiveCost!)) : card.cost_reserve;
  const reduction = card.cost_reserve - chosen;
  const evaluation = evaluateCardCost(card.cost_reserve, rules);
  if (rules.length === 0 && reduction === 0) return compact ? <span className="text-[10px] text-ctp-subtext0">Reserve {card.cost_reserve}</span> : null;
  return <details className={compact ? "mt-1 text-[10px]" : "rounded-lg border border-ctp-surface1 bg-ctp-base/35 p-3 text-xs"}>
    <summary className="flex min-h-8 cursor-pointer items-center gap-1 font-medium text-ctp-subtext1"><span>Printed {card.cost_reserve}</span><span aria-hidden="true">→</span><span className={reduction > 0 ? "text-ctp-green" : "text-ctp-text"}>effective {chosen}</span></summary>
    <div className="mt-2 space-y-2 text-ctp-subtext0">
      {reduction > 0 && <p><b className="text-ctp-text">Applied:</b> {reduction} less under the selected scenario.</p>}
      {rules.map((rule) => <div key={rule.id}><p className="text-ctp-subtext1">{rule.evidence}</p><p className="mt-0.5">Condition: {rule.condition.label} · {rule.costKind.replaceAll("-", " ")} · floor 0 · {rule.stacking}</p>{!rule.supported && <p className="text-ctp-yellow">Manual assumption required: {rule.unsupportedReason}</p>}</div>)}
      {evaluation.unsupported.length > 0 && <p className="text-ctp-yellow">Variable reductions are never applied automatically.</p>}
      <p>Assumption: the entered effective cost applies to this card independently; earlier payments and whether the condition occurs are not simulated.</p>
    </div>
  </details>;
}
