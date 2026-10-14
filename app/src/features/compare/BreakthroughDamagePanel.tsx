import type { Card } from "@gatcg/shared";
import { Link } from "react-router-dom";
import CardArtTile from "../../components/CardArtTile";
import type { BreakthroughDamageResult } from "../../lib/breakthroughDamage";

export default function BreakthroughDamagePanel({ attackerLabel, defenderLabel, result, cardsByName }: { attackerLabel: string; defenderLabel: string; result: BreakthroughDamageResult; cardsByName: Map<string, Card> }) {
  if (result.attackerCount === 0) return null;
  return (
    <div data-component="BreakthroughDamagePanel" className="rounded-lg border border-ctp-surface1 p-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">All-allies combat ceiling · {attackerLabel} → {defenderLabel}</h4>
      <p className="mt-2 text-xs text-ctp-subtext0">Printed ally power</p>
      <p className="mt-1 text-2xl font-semibold text-ctp-text">
        {result.breakthroughTotal} <span className="text-sm font-normal text-ctp-subtext0">of {result.totalAttackPower} power gets through</span>
      </p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ctp-subtext1">
        <span>{result.attackerCount} attacking allies</span>
        <span>{result.interceptedPower} power intercepted ({result.interceptAllyCount} Intercept {result.interceptAllyCount === 1 ? "ally" : "allies"})</span>
        {result.unblockablePower > 0 && <span className="text-ctp-mauve">{result.unblockablePower} unblockable</span>}
      </div>
      {result.boosts && result.boosts.length > 0 && <div className="mt-4 border-t border-ctp-surface1 pt-3">
        {result.boosts.some(b => b.status === "modeled") && result.boosted && <>
          <p className="text-sm font-semibold text-ctp-text">With supported attack boosts</p>
          <p className="mt-1 text-2xl font-semibold text-ctp-green">{result.boosted.breakthroughTotal} <span className="text-sm font-normal text-ctp-subtext1">of {result.boosted.totalAttackPower} power gets through</span></p>
          <p className="mt-1 text-xs text-ctp-subtext1">+{result.boosted.totalAttackPower - result.totalAttackPower} attack power · {result.boosted.interceptedPower} intercepted</p>
        </>}
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{result.boosts.map(boost => {
          const card = cardsByName.get(boost.name);
          return <div key={boost.name} className="min-w-0">
            <Link to={`/cards/${card?.slug ?? ""}`} className="block rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">
              <CardArtTile card={card} name={boost.name} artworkOnly cornerBadge={`${boost.copies}×`} />
              <span className="mt-1 block text-xs font-medium">{boost.name}</span>
            </Link>
            <p className="mt-1 text-xs text-ctp-subtext1">{boost.status === "modeled" ? `+${boost.addedPower} power · ${boost.detail}` : boost.detail}</p>
          </div>;
        })}</div>
      </div>}
      <p className="mt-2 text-[10px] leading-4 text-ctp-subtext0">Theoretical ceiling: assumes every listed ally is simultaneously in play, awake, and attacking. The boosted scenario resolves each supported source once per copy. It does not model draws, turns, costs, removal, or damage prevention.</p>
    </div>
  );
}
