import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DisclosureChevron from "../../components/DisclosureChevron";
import PublishedSourceStatus from "../../components/PublishedSourceStatus";
import PageLayout from "../../components/layout/PageLayout";
import Button from "../../components/ui/Button";
import { InlineState } from "../../components/ui/ContentState";
import PageHeader from "../../components/ui/PageHeader";
import { slugToChampionName } from "../../lib/championSlug";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { usePublishedDataStatus } from "../../lib/sync/usePublishedData";
import { useCardCatalog } from "../cards/useCardCatalog";
import DiaoArchetypeFamilies from "../champions/DiaoArchetypeFamilies";
import ReviewedChampionFamilies from "../champions/ReviewedChampionFamilies";
import ArchetypePreview from "./ArchetypePreview";
import { useArchetypeTaxonomyData } from "./data";

const reviewedChampions = ["Silvie", "Guo Jia", "Rai", "Zander", "Tristan", "Alice", "Allen", "Arisanna", "Ciel", "Diana", "Jin", "Kongming", "Lorraine", "Merlin", "Mordred", "Nico", "Polkhawk", "Tonoris", "Vanitas"] as const;

export default function ChampionArchetypes() {
  const { name = "" } = useParams<{ name: string }>();
  return <ChampionFamilies key={name} championName={slugToChampionName(name)} />;
}

function ChampionFamilies({ championName }: { championName: string }) {
  const reviewedChampion = reviewedChampions.find(name => name === championName);
  const title = `${championName} archetypes`;
  useDocumentTitle(title, `Explore ${championName} build families and defining cards in Grand Archive TCG.`);
  const taxonomyData = useArchetypeTaxonomyData();
  const status = usePublishedDataStatus("analysis-archetype-taxonomy", "/data/analysis/archetype-taxonomy.json");
  const catalog = useCardCatalog();
  const catalogByName = useMemo(() => new Map(catalog.map(card => [card.name, card])), [catalog]);
  const [showAllFamilies, setShowAllFamilies] = useState(false);
  const engines = useMemo(() => (taxonomyData?.clusters ?? [])
    .filter((build) => build.championName === championName || (build.championBreakdown ?? []).some((entry) => entry.championName === championName))
    .map((build) => ({ ...build, relationships: (taxonomyData?.engineArchetypes ?? [])
      .filter((engine) => engine.buildIds.includes(build.id) && (engine.championBreakdown ?? []).length > 1) }))
    .sort((a, b) => b.playerCount - a.playerCount || a.id.localeCompare(b.id)), [taxonomyData, championName]);

  return (
    <PageLayout width="wide">
      <PageHeader title={title} actions={<Link to="/archetypes" className="inline-flex min-h-control items-center rounded text-sm text-ctp-blue hover:underline focus-visible:outline-2">All archetypes</Link>} />
      <PublishedSourceStatus label="Archetype data" status={status} hasData={!!taxonomyData} />
      {taxonomyData && (championName === "Diao Chan" ? (
          <DiaoArchetypeFamilies taxonomy={taxonomyData} catalog={catalogByName} />
        ) : reviewedChampion ? (
          <ReviewedChampionFamilies championName={reviewedChampion} taxonomy={taxonomyData} catalog={catalogByName} />
        ) : engines.length === 0 ? (
          <InlineState className="mt-2 text-sm">No published build families for this champion.</InlineState>
        ) : (
          <div className="mt-3 grid items-start gap-3 sm:grid-cols-2">
            {(showAllFamilies ? engines : engines.slice(0, 2)).map((engine) => {
              const namingCards = engine.namingCards ?? engine.definingCards.slice(0, 3).map((card) => card.name);
              return (
                <article key={engine.id} className="identity-surface min-w-0 rounded-3xl rounded-br-lg p-4 sm:p-5">
                  <ArchetypePreview names={namingCards} cardImages={catalogByName} />
                  <div className="mt-3 flex items-center gap-2">
                    <Link to={`/archetypes/${engine.id}`} className="inline-flex min-h-12 items-center rounded text-lg font-semibold text-ctp-text hover:text-ctp-blue focus-visible:outline-2">{engine.name}</Link>
                  </div>
                  <p className="mt-1 text-xs text-ctp-subtext1">{engine.playerCount} players · {(engine.avgWinRate * 100).toFixed(0)}% win rate</p>
                  <details className="group/build mt-2 border-t border-ctp-surface1 text-sm text-ctp-subtext1">
                    <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-2 rounded text-ctp-blue focus-visible:outline-2">
                      Cards<DisclosureChevron className="group-open/build:rotate-180" />
                    </summary>
                    <ArchetypePreview names={engine.definingCards.slice(0, 6).map(card => card.name)} cardImages={catalogByName} />
                    {engine.relationships.map(relationship => {
                      const core = relationship.commonCore ?? relationship.definingCards;
                      const differentiators = relationship.championEvidence?.find(entry => entry.championName === championName)?.differentiatorCards ?? [];
                      return (
                        <div key={relationship.id} className="mt-4 border-t border-ctp-surface1 pt-3">
                          <h3 className="font-medium text-ctp-text">{relationship.name}</h3>
                          {core.length > 0 && <div className="mt-3">
                            <h4 className="mb-2 font-medium">Common core</h4>
                            <ArchetypePreview names={core.map(card => card.name)} cardImages={catalogByName} />
                          </div>}
                          {differentiators.length > 0 && <div className="mt-3">
                            <h4 className="mb-2 font-medium">{championName}-specific cards</h4>
                            <ArchetypePreview names={differentiators.map(card => card.name)} cardImages={catalogByName} />
                          </div>}
                        </div>
                      );
                    })}
                  </details>
                  <Link className="inline-flex min-h-control items-center rounded text-ctp-blue focus-visible:outline-2" to={`/archetypes/mine?build=${engine.id}`}>Curate this family</Link>
                </article>
              );
            })}
          </div>
        )
      )}
      {taxonomyData && championName !== "Diao Chan" && !reviewedChampion && engines.length > 2 && <Button type="button" onClick={() => setShowAllFamilies((value) => !value)} aria-expanded={showAllFamilies} className="mt-3 min-h-12 rounded-lg border border-ctp-surface1 px-3 py-2 text-sm text-ctp-blue hover:bg-ctp-surface0">{showAllFamilies ? "Show fewer families" : `Show all ${engines.length} families`}</Button>}
    </PageLayout>
  );
}
