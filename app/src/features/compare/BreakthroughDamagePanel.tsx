import type { BreakthroughDamageResult } from "../../lib/breakthroughDamage";

export default function BreakthroughDamagePanel({ attackerLabel, defenderLabel, result }: { attackerLabel: string; defenderLabel: string; result: BreakthroughDamageResult }) {
  if (result.attackerCount === 0) return null;
  return (
    <div data-component="BreakthroughDamagePanel" className="rounded-lg border border-ctp-surface1 p-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">{attackerLabel} attacking → {defenderLabel}</h4>
      <p className="mt-2 text-2xl font-semibold text-ctp-text">
        {result.breakthroughTotal} <span className="text-sm font-normal text-ctp-subtext0">of {result.totalAttackPower} power gets through</span>
      </p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ctp-subtext1">
        <span>{result.attackerCount} attacking allies</span>
        <span>{result.interceptedPower} power intercepted ({result.interceptAllyCount} Intercept {result.interceptAllyCount === 1 ? "ally" : "allies"})</span>
        {result.unblockablePower > 0 && <span className="text-ctp-mauve">{result.unblockablePower} unblockable</span>}
      </div>
    </div>
  );
}
