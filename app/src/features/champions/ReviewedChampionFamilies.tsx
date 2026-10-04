import { Link } from 'react-router-dom';
import { GUO_JIA_COMMAND_CORE, GUO_JIA_COMMAND_NAME, GUO_JIA_MANIFESTATION_PACKAGE, SILVIE_SLIME_CORE, SILVIE_SLIME_NAME, SILVIE_WATER_PACKAGE, type ArchetypeTaxonomyData, type Card } from '@gatcg/shared';
import ArchetypePreview from '../archetypes/ArchetypePreview';
import DisclosureChevron from '../../components/DisclosureChevron';

/** Shared presentation identity, with original family statistics and build membership retained. */
export default function ReviewedChampionFamilies({ championName, taxonomy, catalog }: { championName: 'Silvie' | 'Guo Jia'; taxonomy: ArchetypeTaxonomyData; catalog: Map<string, Card> }) {
  const guo = championName === 'Guo Jia';
  const identityName = guo ? GUO_JIA_COMMAND_NAME : SILVIE_SLIME_NAME;
  const core = guo ? GUO_JIA_COMMAND_CORE : SILVIE_SLIME_CORE;
  const support = guo ? GUO_JIA_MANIFESTATION_PACKAGE : SILVIE_WATER_PACKAGE;
  const coreLabel = guo ? 'Shenju Command' : 'Slime';
  const variantLabel = guo ? 'Auspicious Manifestation variant' : 'Water package variant';
  const families = taxonomy.strategyArchetypes.filter(family => family.championName === championName);
  const buildsById = new Map(taxonomy.clusters.map(build => [build.id, build]));
  const reviewed = families.filter(family => family.name === identityName && family.reviewedArchetypeEvidence);
  const other = families.filter(family => !reviewed.includes(family));
  if (!families.length) return <p className="mt-3 text-sm text-ctp-subtext1">No archetype families have cleared the sample-size threshold yet.</p>;
  const renderFamily = (family: typeof families[number], shared: boolean) => {
    const builds = family.buildIds.flatMap(id => { const build = buildsById.get(id); return build ? [build] : []; });
    const evidence = family.reviewedArchetypeEvidence;
    const hasSupport = shared && evidence && ((guo ? evidence.manifestationPackageDeckCount : evidence.waterPackageDeckCount) ?? 0) / evidence.evaluatedDeckCount >= .9;
    return <article key={family.id} className="min-w-0 rounded-xl bg-ctp-mantle p-4">
      {!shared && <ArchetypePreview names={family.definingCards.slice(0, 3).map(card => card.name)} cardImages={catalog} />}
      {hasSupport && <ArchetypePreview names={support} cardImages={catalog} />}
      <h4 className="mt-2 font-semibold">{shared ? hasSupport ? variantLabel : `${builds.length} ${coreLabel} build variants` : family.name}</h4>
      <p className="mt-2 text-sm text-ctp-subtext1">{family.confidence === 'emerging' ? 'Emerging · ' : ''}{family.deckCount} deck appearances · {family.playerCount} players · {family.eventCount} events · {(family.avgWinRate * 100).toFixed(0)}% win rate</p>
      {hasSupport && <p className="mt-2 text-sm text-ctp-subtext1">{support.join(' and ')} distinguish this variant. They are supporting cards, not required for the {coreLabel} identity.</p>}
      <details className="group/evidence mt-3 border-t border-ctp-surface1 text-sm">
        <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-2 rounded text-ctp-blue focus-visible:outline-2">Cards and evidence<DisclosureChevron className="group-open/evidence:rotate-180" /></summary>
        {shared && evidence ? <>
          <p className="my-2">{evidence.coreDeckCount} of {evidence.evaluatedDeckCount} checked decklists contain all three {coreLabel} core cards.</p>
          <p className="my-2">{support.join(' and ')} appear together in {(guo ? evidence.manifestationPackageDeckCount : evidence.waterPackageDeckCount) ?? 0} of {evidence.evaluatedDeckCount} decklists.</p>
          <p className="my-2 text-ctp-subtext1">Main and material only; sideboards excluded. The shared name requires the complete core in at least 90% of this group, complete decklist coverage, five players and two events. Card presence does not prove a combo was played.</p>
        </> : <><ArchetypePreview names={family.definingCards.slice(0, 6).map(card => card.name)} cardImages={catalog} /><p className="my-2">Common cards across this family, not an exact decklist or required core.</p></>}
      </details>
      <details className="group/builds border-t border-ctp-surface1 text-sm">
        <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-2 rounded text-ctp-blue focus-visible:outline-2">Explore {builds.length} {builds.length === 1 ? 'build' : 'builds'}<DisclosureChevron className="group-open/builds:rotate-180" /></summary>
        {builds.map(build => <div key={build.id} className="border-t border-ctp-surface1 py-3">
          <ArchetypePreview names={(build.namingCards ?? build.definingCards.map(card => card.name)).slice(0, 3)} cardImages={catalog} />
          <Link className="mt-2 flex min-h-control items-center rounded text-ctp-blue focus-visible:outline-2" to={`/archetypes/${build.id}`}>{build.name}</Link>
          <p className="text-ctp-subtext1">{build.confidence === 'emerging' ? 'Emerging · ' : ''}{build.playerCount} players · {(build.avgWinRate * 100).toFixed(0)}% win rate</p>
        </div>)}
      </details>
    </article>;
  };
  return <div className="mt-3 space-y-4">
    {reviewed.length > 0 && <div className="identity-surface min-w-0 rounded-3xl p-4 sm:p-5">
      <div className="max-w-lg"><ArchetypePreview names={core} cardImages={catalog} /></div>
      <h3 className="mt-3 text-lg font-semibold">{identityName}</h3>
      <p className="my-3 text-sm text-ctp-subtext1">One reviewed card identity across {reviewed.reduce((sum, family) => sum + family.buildIds.length, 0)} preserved builds. These three cards identify the {coreLabel} core, not a complete decklist. Statistics remain separate for each original group; players and events may overlap between groups.</p>
      <div className="grid items-start gap-3 sm:grid-cols-2">{reviewed.map(family => renderFamily(family, true))}</div>
    </div>}
    {other.length > 0 && <><h3 className="text-lg font-semibold">Other {championName} families</h3><div className="grid items-start gap-3 sm:grid-cols-2">{other.map(family => renderFamily(family, false))}</div></>}
  </div>;
}
