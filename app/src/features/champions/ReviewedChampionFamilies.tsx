import { Link } from 'react-router-dom';
import { ALLEN_IDENTITIES, ALICE_IDENTITIES, TRISTAN_IDENTITIES, ZANDER_IDENTITIES, RAI_ARCANE_CORE, RAI_ARCANE_NAME, RAI_WIND_PACKAGE, RAI_FIRE_PACKAGE, GUO_JIA_COMMAND_CORE, GUO_JIA_COMMAND_NAME, GUO_JIA_MANIFESTATION_PACKAGE, SILVIE_SLIME_CORE, SILVIE_SLIME_NAME, SILVIE_WATER_PACKAGE, type ArchetypeTaxonomyData, type Card } from '@gatcg/shared';
import ArchetypePreview from '../archetypes/ArchetypePreview';
import DisclosureChevron from '../../components/DisclosureChevron';

/** Shared presentation identity, with original family statistics and build membership retained. */
type Props = { championName: 'Silvie' | 'Guo Jia' | 'Rai' | 'Zander' | 'Tristan' | 'Alice' | 'Allen'; taxonomy: ArchetypeTaxonomyData; catalog: Map<string, Card> };
export default function ReviewedChampionFamilies(props: Props) {
  if (props.championName !== 'Zander' && props.championName !== 'Tristan' && props.championName !== 'Alice' && props.championName !== 'Allen') return <IdentityFamilies {...props} />;
  const identities = props.championName === 'Allen' ? ALLEN_IDENTITIES : props.championName === 'Alice' ? ALICE_IDENTITIES : props.championName === 'Tristan' ? TRISTAN_IDENTITIES : ZANDER_IDENTITIES;
  const reviewedNames = identities.map(identity => identity.name);
  const hasOther = props.taxonomy.strategyArchetypes.some(family => family.championName === props.championName && !reviewedNames.includes(family.name));
  const hasReviewed = props.taxonomy.strategyArchetypes.some(family => family.championName === props.championName && reviewedNames.includes(family.name));
  const groups = [...identities, ...(hasOther || !hasReviewed ? [undefined] : [])];
  return <>{groups.map(identity => <IdentityFamilies key={identity?.name ?? 'other'} {...props} identity={identity} taxonomy={{ ...props.taxonomy, strategyArchetypes: props.taxonomy.strategyArchetypes.filter(family => identity ? family.name === identity.name : !reviewedNames.includes(family.name)) }} />)}</>;
}

function IdentityFamilies({ championName, taxonomy, catalog, identity }: Props & { identity?: typeof ZANDER_IDENTITIES[number] }) {
  const rai = championName === 'Rai';
  const guo = championName === 'Guo Jia';
  const identityName = identity?.name ?? (rai ? RAI_ARCANE_NAME : guo ? GUO_JIA_COMMAND_NAME : SILVIE_SLIME_NAME);
  const core = identity?.core ?? (rai ? RAI_ARCANE_CORE : guo ? GUO_JIA_COMMAND_CORE : SILVIE_SLIME_CORE);
  const support = rai ? RAI_WIND_PACKAGE : guo ? GUO_JIA_MANIFESTATION_PACKAGE : SILVIE_WATER_PACKAGE;
  const coreLabel = identity?.label ?? (rai ? 'Arcane Blast' : guo ? 'Shenju Command' : 'Slime');
  const variantLabel = rai ? 'Wind / Arcane Elemental variant' : guo ? 'Auspicious Manifestation variant' : 'Water package variant';
  const families = taxonomy.strategyArchetypes.filter(family => family.championName === championName);
  const buildsById = new Map(taxonomy.clusters.map(build => [build.id, build]));
  const reviewed = families.filter(family => family.name === identityName && family.reviewedArchetypeEvidence);
  const reviewedBuildCount = reviewed.reduce((sum, family) => sum + family.buildIds.length, 0);
  const other = families.filter(family => !reviewed.includes(family));
  if (!families.length && identity) return null;
  if (!families.length) return <p className="mt-3 text-sm text-ctp-subtext1">No archetype families have cleared the sample-size threshold yet.</p>;
  const renderFamily = (family: typeof families[number], shared: boolean) => {
    const builds = family.buildIds.flatMap(id => { const build = buildsById.get(id); return build ? [build] : []; });
    const evidence = family.reviewedArchetypeEvidence;
    const packages = identity?.packages.map(pkg => ({ ...pkg, count: evidence?.packageDeckCounts?.[pkg.key] ?? 0 })) ?? [{ cards: support, label: variantLabel, count: (rai ? evidence?.windPackageDeckCount : guo ? evidence?.manifestationPackageDeckCount : evidence?.waterPackageDeckCount) ?? 0 }];
    const qualifying = shared && evidence ? packages.filter(pkg => pkg.count / evidence.evaluatedDeckCount >= .9) : [];
    const hasSupport = qualifying.length > 0;
    return <article key={family.id} className="min-w-0 rounded-xl bg-ctp-mantle p-4">
      {!shared && <ArchetypePreview names={family.definingCards.slice(0, 3).map(card => card.name)} cardImages={catalog} />}
      {qualifying.map(pkg => <ArchetypePreview key={pkg.label} names={pkg.cards} cardImages={catalog} />)}
      <h4 className="mt-2 font-semibold">{shared ? hasSupport ? qualifying.map(pkg => pkg.label).join(" · ") : `${builds.length} ${coreLabel} build ${builds.length === 1 ? 'variant' : 'variants'}` : family.name}</h4>
      <p className="mt-2 text-sm text-ctp-subtext1">{family.confidence === 'emerging' ? 'Emerging · ' : ''}{family.deckCount} deck appearances · {family.playerCount} players · {family.eventCount} events · {(family.avgWinRate * 100).toFixed(0)}% win rate</p>
      {hasSupport && <p className="mt-2 text-sm text-ctp-subtext1">These supporting cards distinguish this variant and are optional for the {coreLabel} identity.</p>}
      <details className="group/evidence mt-3 border-t border-ctp-surface1 text-sm">
        <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-2 rounded text-ctp-blue focus-visible:outline-2">Cards and evidence<DisclosureChevron className="group-open/evidence:rotate-180" /></summary>
        {shared && evidence ? <>
          <p className="my-2">{evidence.coreDeckCount} of {evidence.evaluatedDeckCount} checked decklists contain all three {coreLabel} core cards.</p>
          {packages.map(pkg => <p key={pkg.label} className="my-2">{pkg.cards.join(', ')} appear together in {pkg.count} of {evidence.evaluatedDeckCount} decklists.</p>)}
          <p className="my-2 text-ctp-subtext1">Main and material only; sideboards excluded. The shared name requires the complete core in at least 90% of this group, complete decklist coverage, five players and two events. Card presence does not prove a combo was played.</p>
        </> : <><ArchetypePreview names={family.definingCards.slice(0, 6).map(card => card.name)} cardImages={catalog} /><p className="my-2">Common cards across this family, not an exact decklist or required core.</p></>}
      </details>
      <details className="group/builds border-t border-ctp-surface1 text-sm">
        <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-2 rounded text-ctp-blue focus-visible:outline-2">Explore {builds.length} {builds.length === 1 ? 'build' : 'builds'}<DisclosureChevron className="group-open/builds:rotate-180" /></summary>
        {builds.map(build => {
          const fire = evidence?.firePackageByBuild?.[build.id];
          return <div key={build.id} className="border-t border-ctp-surface1 py-3">
          <ArchetypePreview names={(build.namingCards ?? build.definingCards.map(card => card.name)).slice(0, 3)} cardImages={catalog} />
          {rai && fire && fire.total > 0 && fire.count / fire.total >= .9 && <>
            <p className="my-2 font-medium">Fire support package</p>
            <ArchetypePreview names={RAI_FIRE_PACKAGE} cardImages={catalog} />
            <p className="my-2 text-ctp-subtext1">Creative Shock and Fireball appear together in {fire.count} of {fire.total} decklists in this build. Supporting cards, not required for the shared identity.</p>
          </>}
          <Link className="mt-2 flex min-h-control items-center rounded text-ctp-blue focus-visible:outline-2" to={`/archetypes/${build.id}`}>{build.name}</Link>
          <p className="text-ctp-subtext1">{build.confidence === 'emerging' ? 'Emerging · ' : ''}{build.playerCount} players · {(build.avgWinRate * 100).toFixed(0)}% win rate</p>
        </div>; })}
      </details>
    </article>;
  };
  return <div className="mt-3 space-y-4">
    {reviewed.length > 0 && <div className="identity-surface min-w-0 rounded-3xl p-4 sm:p-5">
      <div className="max-w-lg"><ArchetypePreview names={core} cardImages={catalog} /></div>
      <h3 className="mt-3 text-lg font-semibold">{identityName}</h3>
      <p className="my-3 text-sm text-ctp-subtext1">One reviewed card identity across {reviewedBuildCount} preserved {reviewedBuildCount === 1 ? 'build' : 'builds'}. These three cards identify the {coreLabel} core, not a complete decklist. Statistics remain separate for each original group; players and events may overlap between groups.</p>
      <div className="grid items-start gap-3 sm:grid-cols-2">{reviewed.map(family => renderFamily(family, true))}</div>
    </div>}
    {other.length > 0 && <><h3 className="text-lg font-semibold">Other {championName} families</h3><div className="grid items-start gap-3 sm:grid-cols-2">{other.map(family => renderFamily(family, false))}</div></>}
  </div>;
}
