import { Link } from 'react-router-dom';
import type { ReferenceAnalysis } from '@gatcg/shared';
import { usePublishedData } from '../../lib/sync/usePublishedData';
import DisclosureChevron from '../../components/DisclosureChevron';
/** Additive deck intersections; never reinterpret the concrete build's own statistics. */
export default function ReviewedStrategyRelationships({ buildId }: {
    buildId: string;
}) {
    const data = usePublishedData<ReferenceAnalysis>('analysis-curated-strategies', '/data/analysis/curated-strategies.json');
    const parents = data?.evidence.flatMap(e => { const build = e.builds.find(b => b.id === buildId); return build ? [{ ...build, id: e.id, name: data.definitions.find(d => d.id === e.id)?.name ?? e.id }] : []; }) ?? [];
    if (!parents.length)
        return null;
    return <details className="my-3"><summary className="flex min-h-12 cursor-pointer items-center gap-2"><DisclosureChevron />Reviewed strategy relationships ({parents.length})</summary><p className="text-xs">Counts are matching members of this build. Strategy categories may overlap.</p>{parents.map(p => <Link key={p.id} to={`/archetypes/strategies#${p.id}`} className="flex min-h-12 items-center text-ctp-blue">{p.name}: {p.matched}/{p.total} decks</Link>)}</details>;
}
