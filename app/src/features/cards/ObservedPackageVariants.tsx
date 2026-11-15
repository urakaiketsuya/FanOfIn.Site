import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Card, observedPackageVariants } from '@gatcg/shared';
import Button from '../../components/ui/Button';
import PackageCardGrid from './PackageCardGrid';
import { referenceLink } from '../deck-analysis/reportModel';

type Report = ReturnType<typeof observedPackageVariants>[number];
export default function ObservedPackageVariants({ report, cards }: { report: Report; cards: ReadonlyMap<string, Card> }) {
  const [limit, setLimit] = useState(2);
  return <section className="mt-5 border-t border-ctp-surface1 pt-4" aria-label="Observed package variants">
    <h3 className="font-semibold">Observed package variants</h3>
    <p className="mt-2 text-lg font-semibold">{report.eligible ? `${(report.complete / report.eligible * 100).toFixed(1)}%` : '—'} <span className="text-sm font-normal">complete package</span></p>
    <p className="text-xs text-ctp-subtext0">{report.complete}/{report.eligible} eligible lists · {report.partial} partial</p>
    {!report.variants.length && <p className="mt-3 text-sm">{report.eligible ? 'No complete variants observed.' : 'Recorded lists unavailable.'}</p>}
    {report.variants.slice(0, limit).map((variant, i) => {
      const names = [...new Set([...variant.main, ...variant.material].map(l => l.name))];
      const captions = new Map(names.map(name => [name, (['main', 'material'] as const).flatMap(s => variant[s].filter(l => l.name === name).map(l => `${l.quantity} ${s === 'main' ? 'Main' : 'Material'}`)).join(' · ')]));
      return <article key={variant.key} className="mt-4 rounded-lg bg-ctp-mantle p-3">
        <h4 className="font-semibold">Variant {i+1} · {(variant.share*100).toFixed(1)}%</h4><p className="text-xs text-ctp-subtext0">{variant.deckIds.length}/{report.complete} complete lists</p>
        <PackageCardGrid names={names} cardsByName={cards} captions={captions} />
        <Link className="mt-2 inline-flex min-h-control items-center text-sm text-ctp-blue underline" to={referenceLink(variant.deckIds[0])}>Recorded deck →</Link>
      </article>;
    })}
    {report.variants.length > limit && <Button className="mt-3" onClick={() => setLimit(n => n+2)}>Show more variants</Button>}
  </section>;
}
