import { Link } from 'react-router-dom';
import { DIAO_IDENTITIES, DIAO_REBUKE_COMBO, type ArchetypeTaxonomyData, type Card } from '@gatcg/shared';
import ArchetypePreview from '../archetypes/ArchetypePreview';
import DisclosureChevron from '../../components/DisclosureChevron';

/** The Diao pilot presents strategies above preserved build links. */
export default function DiaoArchetypeFamilies({ taxonomy, catalog }: { taxonomy: ArchetypeTaxonomyData; catalog: Map<string, Card> }) {
  const families = taxonomy.strategyArchetypes.filter(family => family.championName === 'Diao Chan');
  const buildsById = new Map(taxonomy.clusters.map(build => [build.id, build]));
  if (!families.length) return <p className="mt-3 text-sm text-ctp-subtext1">No archetype families have cleared the sample-size threshold yet.</p>;
  return <div className="mt-3 grid items-start gap-3 sm:grid-cols-2">{families.map(family => {
    const builds = family.buildIds.flatMap(id => { const build = buildsById.get(id); return build ? [build] : []; }).sort((a, b) => b.playerCount - a.playerCount || a.id.localeCompare(b.id));
    const core = family.identityCards ?? family.definingCards.slice(0, 3).map(card => card.name);
    const evidence = family.diaoPackageEvidence;
    const identity = DIAO_IDENTITIES.find(entry => entry.key === evidence?.identityKey);
    const hasFirePackage = evidence?.cards.some(card => card.deckCount > 0);
    return <article key={family.id} className="identity-surface min-w-0 rounded-3xl rounded-br-lg p-4 sm:p-5">
      <ArchetypePreview names={core} cardImages={catalog} />
      <h3 className="mt-3 text-lg font-semibold">{family.name}</h3>
      <p className="mt-1 text-sm text-ctp-subtext1">{family.confidence === 'emerging' ? 'Emerging · ' : ''}{family.playerCount} players · {family.eventCount} events · {(family.avgWinRate * 100).toFixed(0)}% win rate</p>
      <p className="mt-2 text-sm text-ctp-subtext1">{identity ? `${identity.description} The cards shown are the family’s identifying core, not a complete decklist.` : 'Common cards across this family; these are not an exact decklist or a required core.'}</p>
      <details className="group/cards mt-3 border-t border-ctp-surface1 text-sm">
        <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-2 rounded text-ctp-blue focus-visible:outline-2">Cards<DisclosureChevron className="group-open/cards:rotate-180" /></summary>
        {identity && <>
          <h4 className="my-3 font-semibold">Supporting cards</h4>
          <ArchetypePreview names={identity.support} cardImages={catalog} />
        </>}
        {hasFirePackage && <>
          <h4 className="my-3 font-semibold">Searing Rebuke package</h4>
          <ArchetypePreview names={DIAO_REBUKE_COMBO} cardImages={catalog} />
        </>}
        {!identity && !hasFirePackage && <ArchetypePreview names={family.definingCards.slice(0, 6).map(card => card.name)} cardImages={catalog} />}
      </details>
      <details className="group/variants border-t border-ctp-surface1 text-sm">
        <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-2 rounded text-ctp-blue focus-visible:outline-2">Explore {builds.length} build {builds.length === 1 ? 'variant' : 'variants'}<DisclosureChevron className="group-open/variants:rotate-180" /></summary>
        {builds.map(build => {
          // Full main-deck averages avoid mistaking absence from a truncated defining list for absence from decks.
          const differences = build.mainDeckAverageCards.filter(card => !core.includes(card.name) && card.quantity >= 1 && builds.some(other => other.id !== build.id && (other.mainDeckAverageCards.find(entry => entry.name === card.name)?.quantity ?? 0) <= card.quantity - 1)).slice(0, 3).map(card => card.name);
          return <div key={build.id} className="border-t border-ctp-surface1 py-3">
            {differences.length > 0 && <ArchetypePreview names={differences} cardImages={catalog} />}
            <Link to={`/archetypes/${build.id}`} className="inline-flex min-h-control items-center rounded text-ctp-blue focus-visible:outline-2">{build.name}</Link>
            <p className="text-ctp-subtext1">{build.playerCount} players · {build.deckCount} deck appearances</p>
            <p className="mt-1 text-ctp-subtext1">{differences.length ? 'At least one more copy on average here than in a sibling variant.' : 'No distinct card package established; open the build to compare its decklists.'}</p>
          </div>;
        })}
      </details>
    </article>;
  })}</div>;
}
