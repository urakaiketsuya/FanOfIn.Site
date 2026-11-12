import { Link } from 'react-router-dom';
import type { ArchetypeTaxonomyData, Card } from '@gatcg/shared';
import Section from '../../components/ui/Section';
import Button from '../../components/ui/Button';
import ArchetypePreview from '../archetypes/ArchetypePreview';
import { championNameToSlug } from '../../lib/championSlug';

export default function ChampionRelationships({ championName, taxonomy, catalog, error, onRetry }: {
  championName: string; taxonomy: ArchetypeTaxonomyData | undefined; catalog: Map<string, Card>;
  error?: string | null; onRetry: () => void;
}) {
  const relationships = taxonomy?.reviewedRelationships?.filter(r => r.families.some(f => f.championName === championName)) ?? [];
  const builds = new Map(taxonomy?.clusters.map(b => [b.id, b]));
  return <Section id="relationships" className="scroll-mt-48" title="Shared archetypes and packages">
    {!taxonomy ? <div role={error ? 'alert' : 'status'} className="text-sm text-ctp-subtext1">
      <p>{error || 'Loading shared archetypes and packages…'}</p>
      {error && <Button onClick={onRetry} className="mt-2">Retry shared archetypes</Button>}
    </div> : relationships.length === 0 ? <p className="text-sm text-ctp-subtext1">{taxonomy.reviewedRelationships ? 'No reviewed card relationships found for this champion.' : 'Reviewed relationships are not available in this data release.'}</p> :
      <div className="grid items-start gap-4 lg:grid-cols-2">{relationships.map(relationship => {
        const local = relationship.families.filter(f => f.championName === championName);
        const connected = [...new Set(relationship.families.filter(f => f.championName !== championName && (f.evidence.supported || f.builds.some(b => b.evidence.supported))).map(f => f.championName))].sort();
        return <article key={relationship.id} className="min-w-0 rounded-xl bg-ctp-mantle p-4">
          <h3 className="text-lg font-semibold">{relationship.name}</h3>
          <p className="mb-3 text-sm text-ctp-subtext1">{relationship.kind === 'package' ? 'Supporting package' : 'Archetype relationship'}</p>
          {relationship.variants.map((variant, index) => <div key={variant.id} className="mb-4">
            <p className="mb-2 text-sm font-medium">{relationship.variants.length > 1 ? `Tested variant ${index + 1}` : 'Required core'}</p>
            <ArchetypePreview names={variant.cards} cardImages={catalog} />
          </div>)}
          <div className="flex flex-wrap gap-x-4">
            {[...new Set(local.flatMap(family => family.builds.filter(build => build.evidence.supported).map(build => build.buildId)))].map(id => <Link key={id} className="inline-flex min-h-control min-w-control items-center rounded text-sm text-ctp-blue focus-visible:outline-2" to={`/archetypes/${id}`}>{builds.get(id)?.name ?? 'View build'}</Link>)}
          </div>
          {connected.length > 0 && <div className="mt-4 border-t border-ctp-surface1 pt-3">
            <h4 className="text-sm font-medium">Also played with</h4>
            <div className="flex flex-wrap gap-x-3">{connected.map(name => <Link key={name} className="inline-flex min-h-control min-w-control items-center rounded text-sm text-ctp-blue focus-visible:outline-2" to={`/champions/${championNameToSlug(name)}#relationships`}>{name}</Link>)}</div>
          </div>}
        </article>;
      })}</div>}
  </Section>;
}
