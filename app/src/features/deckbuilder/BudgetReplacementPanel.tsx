import CardResult from '../../components/CardResult';
import Button from '../../components/ui/Button';
import { formatUsd } from '../../lib/format';
import { useBudgetReplacements } from './useBudgetReplacements';

export default function BudgetReplacementPanel() {
  const c = useBudgetReplacements();
  const sourceLine = c.deck.main.find(line => line.card === c.source);
  const blocked = c.protectedNames.has(c.source) ? 'Protected by an active package.' : sourceLine?.printings?.length ? 'Clear this card’s printing selections to find replacements.' : null;
  return <section aria-label="Budget replacements" className="space-y-3">
    {c.format !== 'STANDARD' ? <p>Available for Standard decks.</p> : <>
      {c.unresolvedCards.length > 0 && <p role="status">Unrecognized cards: {c.unresolvedCards.join(', ')}.</p>}
      {c.packageError && <p role="alert">{c.packageError}</p>}
      {c.pricing.loading && <p role="status">Loading prices…</p>}
      {c.pricing.error && <div role="alert"><p>{c.pricing.error}</p><Button onClick={c.pricing.retry}>Retry prices</Button></div>}
      {!c.pricing.loading && !c.fresh && <div><p role="status">Prices need updating.</p><Button onClick={c.pricing.retry}>Refresh prices</Button></div>}
      {!!c.deck.main.length && <>
        <label className="block text-sm">Replace<select aria-label="Card to replace" className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3" value={c.source} onChange={e => c.chooseSource(e.target.value)}>{c.deck.main.map(line => <option key={line.card} value={line.card}>{line.card}</option>)}</select></label>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {sourceLine && <label className="flex items-center gap-2 text-sm">Copies<select aria-label="Copies to replace" className="min-h-12 rounded-lg border border-ctp-surface1 bg-ctp-base px-3" value={c.quantity} onChange={e => c.chooseQuantity(Number(e.target.value))}>{Array.from({ length: Math.max(0, Math.min(4, sourceLine.quantity)) }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></label>}
          <label className="flex min-h-12 items-center gap-2 text-sm"><input type="checkbox" checked={c.includeRoleMatches} onChange={c.toggleRoles} />Broader matches</label>
        </div>
      </>}
      {!c.deck.main.length && <p>Add Main Deck cards first.</p>}
      {blocked && <p role="status">{blocked}</p>}
      {c.source && !c.prices.has(c.source) && c.fresh && <p role="status">Price unavailable for this card.</p>}
      <p role="status" className="text-sm empty:hidden">{c.pending ? 'Recalculating…' : c.message}</p>
      {c.fresh && c.source && c.prices.has(c.source) && !blocked && !c.packageError && !c.unresolvedCards.length && !c.pending && !c.results.length && <p>No cheaper matches. Try another card or fewer copies.</p>}
      <div className="grid gap-4" aria-busy={c.pending}>
        {c.fresh && c.results.slice(0, 12).map(row => {
          const labels = [row.match === 'Shared role' ? 'Similar role' : 'Similar effect'];
          if (row.differences.cost) labels.push(`Cost ${row.differences.cost > 0 ? '+' : ''}${row.differences.cost}`);
          if (typeof row.from.speed === 'boolean' && typeof row.to.speed === 'boolean' && row.from.speed !== row.to.speed) labels.push(row.to.speed ? 'Fast speed' : 'Slow speed');
          if (row.preserved.length) labels.push(`${row.preserved[0]} support`);
          else for (const key of ['power', 'life', 'durability'] as const) {
            const delta = row.differences[key];
            if (delta) labels.push(`${key[0].toUpperCase()}${key.slice(1)} ${delta > 0 ? '+' : ''}${delta}`);
          }
          return <article key={`${row.from.name}:${row.to.name}`} className="rounded-xl border border-ctp-surface1 p-3">
            <div className="grid grid-cols-2 gap-3">
              <CardResult card={row.from} name={row.from.name} newTab><p className="text-xs">{row.quantity}× · {formatUsd(row.unitBefore)} each</p></CardResult>
              <CardResult card={row.to} name={row.to.name} newTab><p className="text-xs">{row.quantity}× · {formatUsd(row.unitAfter)} each</p></CardResult>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">{labels.slice(0, 3).map(label => <span key={label} className="rounded-md bg-ctp-surface0 px-2 py-1 text-xs">{label}</span>)}</div>
            <div className="my-3 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-lg font-semibold">Save ~{formatUsd(row.savings)}</p>
              <p className="text-xs text-ctp-subtext1">{c.total.missingCards.length ? `Priced cards ~${formatUsd(c.total.total - row.savings)} · ${c.total.missingCards.length} unpriced` : `Deck ~${formatUsd(c.total.total - row.savings)}`}</p>
            </div>
            <Button variant="primary" disabled={c.pending} className="w-full" aria-label={`Replace ${row.quantity} ${row.quantity === 1 ? 'copy' : 'copies'} with ${row.to.name}`} onClick={() => c.accept(row)}>Replace {row.quantity} {row.quantity === 1 ? 'copy' : 'copies'}</Button>
          </article>;
        })}
      </div>
      {c.pricing.updatedAt && <p className="text-xs text-ctp-subtext0">Prices · {c.pricing.updatedAt.slice(0, 10)}</p>}
    </>}
  </section>;
}
