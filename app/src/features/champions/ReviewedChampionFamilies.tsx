import { Link } from 'react-router-dom';
import { REVIEWED_ARCHETYPE_CORES, REMAINING_CHAMPION_IDENTITIES, JIN_IDENTITIES, GUO_JIA_IDENTITIES, DIANA_IDENTITIES, CIEL_IDENTITIES, ARISANNA_IDENTITIES, ALLEN_IDENTITIES, ALICE_IDENTITIES, TRISTAN_IDENTITIES, ZANDER_IDENTITIES, RAI_ARCANE_CORE, RAI_ARCANE_NAME, RAI_WIND_PACKAGE, RAI_FIRE_PACKAGE, GUO_JIA_COMMAND_CORE, GUO_JIA_COMMAND_NAME, GUO_JIA_MANIFESTATION_PACKAGE, SILVIE_SLIME_CORE, SILVIE_SLIME_NAME, SILVIE_WATER_PACKAGE, type ArchetypeTaxonomyData, type Card } from '@gatcg/shared';
import ArchetypePreview from '../archetypes/ArchetypePreview';

/** Shared presentation identity, with original family statistics and build membership retained. */
type Props = { championName: 'Silvie' | 'Guo Jia' | 'Rai' | 'Zander' | 'Tristan' | 'Alice' | 'Allen' | 'Arisanna' | 'Ciel' | 'Diana' | 'Jin' | 'Kongming' | 'Lorraine' | 'Merlin' | 'Mordred' | 'Nico' | 'Polkhawk' | 'Tonoris' | 'Vanitas'; taxonomy: ArchetypeTaxonomyData; catalog: Map<string, Card> };
export default function ReviewedChampionFamilies(props: Props) {
  const identities = [...JIN_IDENTITIES, ...GUO_JIA_IDENTITIES, ...DIANA_IDENTITIES, ...CIEL_IDENTITIES, ...ARISANNA_IDENTITIES, ...ALLEN_IDENTITIES, ...ALICE_IDENTITIES, ...TRISTAN_IDENTITIES, ...ZANDER_IDENTITIES, ...REMAINING_CHAMPION_IDENTITIES, ...REVIEWED_ARCHETYPE_CORES.filter(identity => identity.champion === 'Lorraine' && !REMAINING_CHAMPION_IDENTITIES.some(added => added.name === identity.name)).map(identity => ({ ...identity, label: identity.name.split(' — ')[1], packages: [] }))].filter(identity => identity.champion === props.championName);
  if (!identities.length) return <IdentityFamilies {...props} />;
  const reviewedNames = identities.map(identity => identity.name);
  const hasOther = props.taxonomy.strategyArchetypes.some(family => family.championName === props.championName && !reviewedNames.includes(family.name));
  const hasReviewed = props.taxonomy.strategyArchetypes.some(family => family.championName === props.championName && reviewedNames.includes(family.name));
  const groups = [...identities, ...(hasOther || !hasReviewed ? [undefined] : [])];
  return <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(100%,22rem),1fr))] items-start gap-4">{groups.map(identity => <IdentityFamilies key={identity?.name ?? 'other'} {...props} identity={identity} taxonomy={{ ...props.taxonomy, strategyArchetypes: props.taxonomy.strategyArchetypes.filter(family => identity ? family.name === identity.name : !reviewedNames.includes(family.name)) }} />)}</div>;
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
  const hasAlternateCore = reviewed.some(family => family.identityCards?.join('\0') !== core.join('\0'));
  const reviewedBuildCount = reviewed.reduce((sum, family) => sum + family.buildIds.length, 0);
  const other = families.filter(family => !reviewed.includes(family));
  if (!families.length && identity) return null;
  if (!families.length) return <p className="mt-3 text-sm text-ctp-subtext1">No archetypes found yet.</p>;
  const renderFamily = (family: typeof families[number], shared: boolean) => {
    const builds = family.buildIds.flatMap(id => { const build = buildsById.get(id); return build ? [build] : []; });
    const evidence = family.reviewedArchetypeEvidence;
    const remainingBuilds = builds.filter(build => !family.reviewedBuildPlans?.[build.id]?.length);
    const familyCore = family.identityCards ?? core;
    const packages = identity?.packages.filter(pkg => pkg.cards.length !== familyCore.length || !pkg.cards.every(name => familyCore.includes(name))).map(pkg => ({ ...pkg, count: evidence?.packageDeckCounts?.[pkg.key] ?? 0 })) ?? [{ cards: support, label: variantLabel, count: (rai ? evidence?.windPackageDeckCount : guo ? evidence?.manifestationPackageDeckCount : evidence?.waterPackageDeckCount) ?? 0 }];
    const qualifying = shared && evidence ? packages.filter(pkg => pkg.count / evidence.evaluatedDeckCount >= .9) : [];
    const hasSupport = qualifying.length > 0;
    return <article key={family.id} className="min-w-0 rounded-xl bg-ctp-mantle p-4">
      {shared && hasAlternateCore && <ArchetypePreview names={familyCore} cardImages={catalog} />}
      {!shared && <ArchetypePreview names={family.definingCards.slice(0, 3).map(card => card.name)} cardImages={catalog} />}
      {qualifying.map(pkg => <ArchetypePreview key={pkg.label} names={pkg.cards} cardImages={catalog} />)}
      <h4 className="mt-2 font-semibold">{shared ? hasSupport ? qualifying.map(pkg => pkg.label).join(" · ") : `${builds.length} ${coreLabel} build ${builds.length === 1 ? 'variant' : 'variants'}` : family.name}</h4>
      <p className="mt-2 text-sm text-ctp-subtext1">{family.confidence === 'emerging' ? 'Emerging · ' : ''}{family.deckCount} deck appearances · {family.playerCount} players · {family.eventCount} events · {(family.avgWinRate * 100).toFixed(0)}% win rate</p>
      {builds.filter(build => family.reviewedBuildPlans?.[build.id]?.length).map(build => <section key={build.id} className="mt-4 border-t border-ctp-surface1 pt-3" aria-label={`Card plans for ${build.name}`}>
        {family.reviewedBuildPlans![build.id].map(plan => <div key={plan.label} className="mb-3">
          <ArchetypePreview names={plan.core} cardImages={catalog} />
          <h5 className="mt-2 font-semibold">{plan.label} core</h5>
          <p className="text-sm text-ctp-subtext1">All {plan.core.length} cards in {plan.coreDeckCount}/{plan.evaluatedDeckCount} decklists in this build</p>
        </div>)}
        <Link className="flex min-h-control items-center rounded text-sm text-ctp-blue focus-visible:outline-2" to={`/archetypes/${build.id}`}>{build.name}</Link>
        <p className="text-sm text-ctp-subtext1">{build.playerCount} players · {build.eventCount} events</p>
      </section>)}
      {remainingBuilds.length > 0 && <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] items-start gap-3 border-t border-ctp-surface1 text-sm">
        {remainingBuilds.map(build => {
          const fire = evidence?.firePackageByBuild?.[build.id];
          return <div key={build.id} className="border-t border-ctp-surface1 py-3">
          <ArchetypePreview names={(build.namingCards ?? build.definingCards.map(card => card.name)).slice(0, 3)} cardImages={catalog} />
          {rai && fire && fire.total > 0 && fire.count / fire.total >= .9 && <>
            <p className="my-2 font-medium">Fire support package</p>
            <ArchetypePreview names={RAI_FIRE_PACKAGE} cardImages={catalog} />
          </>}
          <Link className="mt-2 flex min-h-control items-center rounded text-ctp-blue focus-visible:outline-2" to={`/archetypes/${build.id}`}>{build.name}</Link>
          <p className="text-ctp-subtext1">{build.confidence === 'emerging' ? 'Emerging · ' : ''}{build.playerCount} players · {(build.avgWinRate * 100).toFixed(0)}% win rate</p>
        </div>; })}
      </div>}
    </article>;
  };
  return <div className="min-w-0 space-y-4">
    {reviewed.length > 0 && <div className="identity-surface min-w-0 rounded-3xl p-4 sm:p-5">
      {!hasAlternateCore && <div className="max-w-lg"><ArchetypePreview names={core} cardImages={catalog} /></div>}
      <h3 className="mt-3 text-lg font-semibold">{identityName}</h3>
      <p className="my-3 text-sm text-ctp-subtext1">Core cards · {reviewedBuildCount} {reviewedBuildCount === 1 ? 'build' : 'builds'}</p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] items-start gap-3">{reviewed.map(family => renderFamily(family, true))}</div>
    </div>}
    {other.length > 0 && <><h3 className="text-lg font-semibold">Other {championName} families</h3><div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] items-start gap-3">{other.map(family => renderFamily(family, false))}</div></>}
  </div>;
}
