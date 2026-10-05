import { Link } from 'react-router-dom';
import type { ArchetypeTaxonomyData, Card, RelationshipEvidence } from '@gatcg/shared';
import Section from '../../components/ui/Section';
import Button from '../../components/ui/Button';
import ArchetypePreview from '../archetypes/ArchetypePreview';
import { championNameToSlug } from '../../lib/championSlug';

function Evidence({ evidence: e }: { evidence: RelationshipEvidence }) {
  return <p className="text-sm text-ctp-subtext1">{e.supported ? 'Supported' : e.matchingDeckCount === 0 ? 'No matches' : 'Observed only'} · {e.matchingDeckCount}/{e.deckCount} decklists · {e.playerCount} matching players · {e.eventCount} events
    {e.exceptionDeckIds.length > 0 && <span className="block">{e.exceptionDeckIds.length} decklists without a confirmed match</span>}
  </p>;
}

export default function ChampionRelationships({ championName, taxonomy, catalog, error, onRetry }: {
  championName: string; taxonomy: ArchetypeTaxonomyData | undefined; catalog: Map<string, Card>;
  error?: string | null; onRetry: () => void;
}) {
  const relationships = taxonomy?.reviewedRelationships?.filter(r => r.families.some(f => f.championName === championName)) ?? [];
  const families = new Map(taxonomy?.strategyArchetypes.map(f => [f.id, f]));
  const builds = new Map(taxonomy?.clusters.map(b => [b.id, b]));
  return <Section id="relationships" className="scroll-mt-48" title="Shared archetypes and packages" description="Historical decklist matches · all elements">
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
            <p className="mb-2 text-sm font-medium">{relationship.variants.length > 1 ? `Tested variant ${index + 1} · all ${variant.cards.length} cards` : `Required core · all ${variant.cards.length} cards`}</p>
            <ArchetypePreview names={variant.cards} cardImages={catalog} />
          </div>)}
          {relationship.variants.length > 1 && <p className="mb-3 text-sm text-ctp-subtext1">A match contains either complete variant. Variants can overlap.</p>}
          {local.map(family => <div key={family.familyId} className="mt-3 border-t border-ctp-surface1 pt-3">
            <h4 className="font-medium">{families.get(family.familyId)?.name ?? championName}</h4>
            <Evidence evidence={family.evidence} />
            {family.variants.map((variant, index) => relationship.variants.length > 1 && <p key={variant.variantId} className="text-sm text-ctp-subtext1">Variant {index + 1}: {variant.evidence.matchingDeckCount}/{variant.evidence.deckCount} decklists · {variant.evidence.supported ? 'Supported' : 'Observed only'}</p>)}
            <ul className="mt-2 space-y-2">{family.builds.map(build => <li key={build.buildId}>
              <Link className="inline-flex min-h-control min-w-control items-center rounded text-sm text-ctp-blue focus-visible:outline-2" to={`/archetypes/${build.buildId}`}>{builds.get(build.buildId)?.name ?? 'View build'}</Link>
              <Evidence evidence={build.evidence} />
            </li>)}</ul>
          </div>)}
          {connected.length > 0 && <div className="mt-4 border-t border-ctp-surface1 pt-3">
            <h4 className="text-sm font-medium">Supported families or builds in other champions</h4>
            <div className="flex flex-wrap gap-x-3">{connected.map(name => <Link key={name} className="inline-flex min-h-control min-w-control items-center rounded text-sm text-ctp-blue focus-visible:outline-2" to={`/champions/${championNameToSlug(name)}#relationships`}>{name}</Link>)}</div>
          </div>}
        </article>;
      })}</div>}
  </Section>;
}
