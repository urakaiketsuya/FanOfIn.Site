import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import CardHoverPreview from "../../components/CardHoverPreview";
import CardImage from "../../components/CardImage";
import PageHeader from "../../components/ui/PageHeader";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { getDeckPackageCatalog } from "../deckbuilder/packageGuardrails";
import { localPackageApprovalId, useLocalPackageApprovals } from "../deckbuilder/localPackageApprovals";
import { DECK_PACKAGE_CANDIDATES } from "../deckbuilder/packageCandidates";
import { useMinedPackageCandidates } from "../deckbuilder/useMinedPackageCandidates";
import { useCardCatalog } from "./useCardCatalog";
import PageLayout from "../../components/layout/PageLayout";

export default function PackagesIndex() {
  useDocumentTitle("Card Packages", "Browse explicit card packages used by Fan of Insight deck-review guardrails.");
  const cards = useCardCatalog();
  const location = useLocation();
  const cardsByName = useMemo(() => new Map(cards.map((card) => [card.name, card])), [cards]);
  const packages = useMemo(() => getDeckPackageCatalog([]), []);
  const minedData = useMinedPackageCandidates();
  const { approvals: localApprovals, approve, approveFamily, revoke } = useLocalPackageApprovals();
  const approvedIds = useMemo(() => new Set(localApprovals.map((entry) => entry.id)), [localApprovals]);
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const visiblePackages = packages.filter((entry) =>
    query === "" || entry.label.toLowerCase().includes(query) || entry.memberCards.some((name) => name.toLowerCase().includes(query)),
  );
  const visibleCandidates = DECK_PACKAGE_CANDIDATES.filter((entry) =>
    query === "" || entry.label.toLowerCase().includes(query) || entry.memberCards.some((name) => name.toLowerCase().includes(query)),
  );
  const reviewedCardSets = useMemo(() => [
    ...packages.map((entry) => new Set(entry.memberCards)),
    ...DECK_PACKAGE_CANDIDATES.map((entry) => new Set(entry.memberCards)),
  ], [packages]);
  const minedCandidates = (minedData?.candidates ?? []).filter((entry) => {
    const cards = [entry.anchorCard, ...entry.memberCards];
    return entry.confidenceScore >= 40 && !reviewedCardSets.some((known) => cards.every((card) => known.has(card)));
  });
  const visibleMinedCandidates = minedCandidates.filter((entry) => {
    const cards = [entry.anchorCard, ...entry.memberCards];
    return query === "" || cards.some((name) => name.toLowerCase().includes(query));
  });
  const minedFamilies = (minedData?.families ?? []).filter((entry) => {
    const names = [entry.anchorCard, ...entry.coreCards, ...entry.optionCards];
    return names.length > 3 && !reviewedCardSets.some((known) => names.every((card) => known.has(card)));
  });
  const visibleMinedFamilies = minedFamilies.filter((entry) => {
    const names = [entry.anchorCard, ...entry.coreCards, ...entry.optionCards];
    return query === "" || names.some((name) => name.toLowerCase().includes(query));
  });
  const approveAllMined = () => {
    for (const family of minedFamilies) {
      approveFamily(`${family.anchorCard} family`, family.anchorCard, family.coreCards, family.optionCards, family.minOptions);
    }
    for (const entry of minedCandidates) {
      const names = [entry.anchorCard, ...entry.memberCards];
      const coveredByFamily = minedFamilies.some((family) => {
        const familyNames = new Set([family.anchorCard, ...family.coreCards, ...family.optionCards]);
        return names.every((name) => familyNames.has(name));
      });
      if (!coveredByFamily) approve(`${entry.anchorCard} package`, names);
    }
  };

  useEffect(() => {
    if (!location.hash) return;
    const id = decodeURIComponent(location.hash.slice(1));
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
  }, [location.hash]);

  return (
    <PageLayout width="wide">
      <PageHeader
        title="Card Packages"
        description="Explicit groups of cards whose construction relationship should be reviewed together. Packages guide suggestions without redefining a deck's archetype."
        actions={<Link to="/cards/stats" className="text-sm text-ctp-blue hover:underline">Card stats &rarr;</Link>}
      />

      <div className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="block min-w-64 flex-1 text-xs font-medium uppercase tracking-wide text-ctp-subtext0">
            Find a package or member card
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Fluffy Shopkeep, Resonance Bauble…"
              className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm normal-case tracking-normal text-ctp-text placeholder:text-ctp-overlay0 focus:border-ctp-blue focus:outline-none"
            />
          </label>
          <p className="text-sm text-ctp-subtext0">{visiblePackages.length} registered · {localApprovals.length} locally approved · {visibleCandidates.length} curated · {visibleMinedCandidates.length} newly mined</p>
        </div>
      </div>

      {localApprovals.length > 0 && (
        <section className="mt-10 border-t border-ctp-surface1 pt-8">
          <div className="mb-4">
            <h2 className="text-2xl font-bold tracking-tight text-ctp-text">Locally approved</h2>
            <p className="mt-2 text-sm text-ctp-subtext1">Stored only in this browser. These packages protect their present members in Guided Deck Builder reviews when their saved activation rule is met.</p>
          </div>
          <div className="space-y-3">
            {localApprovals.map((entry) => (
              <article key={entry.id} className="rounded-xl border border-ctp-green/30 bg-ctp-mantle p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-ctp-text">{entry.label}</h3><span className="rounded-full bg-ctp-green/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ctp-green">Local guardrail</span></div>
                    <p className="mt-1 text-xs text-ctp-subtext1">
                      {entry.optionCards.length > 0
                        ? `Requires ${entry.requiredCards.join(" + ")} and ${entry.minOptions} of: ${entry.optionCards.join(", ")}`
                        : entry.memberCards.join(" · ")}
                    </p>
                  </div>
                  <button type="button" onClick={() => revoke(entry.id)} className="rounded-md border border-ctp-red/40 px-3 py-1.5 text-xs font-medium text-ctp-red hover:bg-ctp-red/10">Revoke</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {visiblePackages.length === 0 && <p className="mt-6 text-sm text-ctp-subtext1">No packages match that search.</p>}

      <div className="mt-6 space-y-5">
        {visiblePackages.map((entry) => {
          const prevalence = entry.observedSupport
            ? entry.observedSupport.matchingDecks / entry.observedSupport.populationDecks
            : null;
          return (
            <article id={entry.id} key={entry.id} className="scroll-mt-20 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-ctp-text">{entry.label}</h2>
                    <span className="rounded-full border border-ctp-teal/40 bg-ctp-teal/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ctp-teal">Registered</span>
                  </div>
                  <p className="mt-1 text-sm text-ctp-subtext1">{entry.explanation}</p>
                </div>
                {entry.observedSupport && prevalence !== null && (
                  <div className="rounded-lg bg-ctp-base px-3 py-2 text-right">
                    <p className="text-lg font-semibold text-ctp-mauve">{(prevalence * 100).toFixed(1)}%</p>
                    <p className="text-[10px] text-ctp-subtext0">historical prevalence</p>
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-lg border border-ctp-surface0 bg-ctp-base/50 px-4 py-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Activation rule</h3>
                <p className="mt-1 text-sm text-ctp-text">{entry.activation}</p>
              </div>

              <div className="mt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Member cards</h3>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {entry.memberCards.map((name) => {
                    const card = cardsByName.get(name);
                    const content = (
                      <div className="flex items-center gap-3 rounded-lg border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm text-ctp-text hover:border-ctp-blue/50 hover:text-ctp-blue">
                        {card?.editions[0] ? <CardImage image={card.editions[0].image} alt={name} className="h-12 w-9 rounded object-cover object-top" /> : <div className="h-12 w-9 rounded bg-ctp-surface0" />}
                        <span className="font-medium">{name}</span>
                      </div>
                    );
                    return card ? (
                      <CardHoverPreview key={name} image={card.editions[0]?.image} alt={name}>
                        <Link to={`/cards/${card.slug}`}>{content}</Link>
                      </CardHoverPreview>
                    ) : <div key={name}>{content}</div>;
                  })}
                </div>
              </div>

              {entry.observedSupport && (
                <p className="mt-4 text-xs text-ctp-overlay1">
                  Observed in {entry.observedSupport.matchingDecks.toLocaleString()} of {entry.observedSupport.populationDecks.toLocaleString()} decks in the {entry.observedSupport.auditLabel}. This historical audit documents support; it is not a live activation threshold.
                </p>
              )}
            </article>
          );
        })}
      </div>

      <section className="mt-10 border-t border-ctp-surface1 pt-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-ctp-text">Candidates for review</h2>
            <p className="mt-2 text-sm leading-6 text-ctp-subtext1">Data-mined nominations with a verified rules-text relationship. These do not protect cards or change deck suggestions unless they are reviewed and promoted into the registered package rules.</p>
          </div>
          <span className="rounded-full bg-ctp-peach/10 px-2.5 py-1 text-xs font-semibold text-ctp-peach">{visibleCandidates.length} candidates</span>
        </div>
        {visibleCandidates.length === 0 && <p className="text-sm text-ctp-subtext1">No review candidates match that search.</p>}
        <div className="space-y-4">
          {visibleCandidates.map((entry) => (
            <article id={entry.id} key={entry.id} className="scroll-mt-20 rounded-xl border border-ctp-peach/30 bg-ctp-mantle p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-ctp-text">{entry.label}</h2>
                    <span className="rounded-full border border-ctp-peach/40 bg-ctp-peach/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ctp-peach">Needs review</span>
                  </div>
                  <p className="mt-1 text-sm text-ctp-subtext1">{entry.rationale}</p>
                </div>
                <div className="rounded-lg bg-ctp-base px-3 py-2 text-right">
                  <p className="text-lg font-semibold text-ctp-peach">{entry.evidence.matchingDecks.toLocaleString()}</p>
                  <p className="text-[10px] text-ctp-subtext0">matching decks</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-ctp-surface0 bg-ctp-base/50 px-4 py-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Proposed activation</h3>
                  <p className="mt-1 text-sm text-ctp-text">{entry.proposedActivation}</p>
                </div>
                <div className="rounded-lg border border-ctp-surface0 bg-ctp-base/50 px-4 py-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Proposed protection</h3>
                  <p className="mt-1 text-sm text-ctp-text">{entry.proposedProtection}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {entry.memberCards.map((name) => {
                  const card = cardsByName.get(name);
                  return card ? (
                    <CardHoverPreview key={name} image={card.editions[0]?.image} alt={name}>
                      <Link to={`/cards/${card.slug}`} className="flex items-center gap-2 rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-1.5 text-xs text-ctp-text hover:border-ctp-blue/50 hover:text-ctp-blue">
                        {card.editions[0] && <CardImage image={card.editions[0].image} alt={name} className="h-9 w-6 rounded object-cover object-top" />}
                        {name}
                      </Link>
                    </CardHoverPreview>
                  ) : <span key={name} className="rounded-md border border-ctp-surface1 px-2 py-1.5 text-xs">{name}</span>;
                })}
              </div>

              <p className="mt-4 text-xs text-ctp-overlay1">
                {entry.evidence.kind} · {entry.evidence.sectionPattern} · {entry.evidence.matchingDecks.toLocaleString()} matches among {entry.evidence.anchorDecks.toLocaleString()} decks containing the anchor card.
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 border-t border-ctp-surface1 pt-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight text-ctp-text">Newly mined relationships</h2>
            <p className="mt-2 text-sm leading-6 text-ctp-subtext1">
              Rules-text and archetype defining-card nominations scored against champion-stratified deck data. Candidates below 40 confidence, and relationships already covered above, stay in the audit data but are hidden here. Archetype overlap is discovery evidence, not proof that cards are mechanically inseparable. Local approvals can be revoked and refined later.
            </p>
          </div>
          {(minedFamilies.length > 0 || minedCandidates.length > 0) && (
            <button type="button" onClick={approveAllMined} className="rounded-md border border-ctp-teal/50 bg-ctp-teal/10 px-3 py-2 text-xs font-semibold text-ctp-teal hover:bg-ctp-teal/20">
              Approve all mined
            </button>
          )}
        </div>
        {!minedData && <p className="text-sm text-ctp-subtext1">Loading the latest package audit…</p>}
        {minedData && visibleMinedCandidates.length === 0 && visibleMinedFamilies.length === 0 && <p className="text-sm text-ctp-subtext1">No newly mined relationships match that search.</p>}
        {visibleMinedFamilies.length > 0 && (
          <div className="mb-7">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div><h3 className="text-lg font-semibold text-ctp-text">Overlapping package families</h3><p className="mt-1 text-xs text-ctp-subtext1">Related candidates merged into required cards and interchangeable options.</p></div>
              <span className="rounded-full bg-ctp-teal/10 px-2.5 py-1 text-xs font-semibold text-ctp-teal">{visibleMinedFamilies.length} families</span>
            </div>
            <div className="space-y-4">
              {visibleMinedFamilies.map((family) => {
                const names = [family.anchorCard, ...family.coreCards, ...family.optionCards];
                const approvalId = localPackageApprovalId(names);
                const isApproved = approvedIds.has(approvalId);
                return (
                  <article key={`${family.anchorCard}:${family.optionCards.join("|")}`} className="rounded-xl border border-ctp-teal/30 bg-ctp-mantle p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><div className="flex flex-wrap items-center gap-2"><h4 className="text-lg font-semibold text-ctp-text">{family.anchorCard} family</h4><span className="rounded-full bg-ctp-teal/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ctp-teal">{names.length} cards</span></div><p className="mt-1 text-sm text-ctp-subtext1">Merged from {family.candidateCount} overlapping relationships · {family.matchingDecks.toLocaleString()} strongest matches</p></div>
                      <div className="flex items-center gap-3"><div className="rounded-lg bg-ctp-base px-3 py-2 text-right"><p className="text-lg font-semibold text-ctp-teal">{family.confidenceScore}/100</p><p className="text-[10px] text-ctp-subtext0">best evidence</p></div>{isApproved ? <button type="button" onClick={() => revoke(approvalId)} className="rounded-md border border-ctp-green/50 bg-ctp-green/10 px-3 py-2 text-xs font-semibold text-ctp-green hover:bg-ctp-red/10 hover:text-ctp-red">Approved locally</button> : <button type="button" onClick={() => approveFamily(`${family.anchorCard} family`, family.anchorCard, family.coreCards, family.optionCards, family.minOptions)} className="rounded-md border border-ctp-teal/50 px-3 py-2 text-xs font-semibold text-ctp-teal hover:bg-ctp-teal/10">Approve family</button>}</div>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-ctp-surface0 bg-ctp-base/50 px-4 py-3"><h5 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Required</h5><p className="mt-1 text-sm text-ctp-text">{[family.anchorCard, ...family.coreCards].join(" + ")}</p></div>
                      <div className="rounded-lg border border-ctp-surface0 bg-ctp-base/50 px-4 py-3"><h5 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Options</h5><p className="mt-1 text-sm text-ctp-text">At least {family.minOptions} of {family.optionCards.length}: {family.optionCards.join(", ")}</p></div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">{names.map((name) => { const card = cardsByName.get(name); return card ? <CardHoverPreview key={name} image={card.editions[0]?.image} alt={name}><Link to={`/cards/${card.slug}`} className="flex items-center gap-2 rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-1.5 text-xs text-ctp-text hover:border-ctp-blue/50 hover:text-ctp-blue">{card.editions[0] && <CardImage image={card.editions[0].image} alt={name} className="h-9 w-6 rounded object-cover object-top" />}{name}</Link></CardHoverPreview> : <span key={name} className="rounded-md border border-ctp-surface1 px-2 py-1.5 text-xs">{name}</span>; })}</div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
        <div className="space-y-4">
          {visibleMinedCandidates.map((entry) => {
            const names = [entry.anchorCard, ...entry.memberCards];
            const approvalId = localPackageApprovalId(names);
            const isApproved = approvedIds.has(approvalId);
            return (
              <article key={`${entry.anchorCard}:${entry.memberCards.join("|")}`} className="rounded-xl border border-ctp-mauve/30 bg-ctp-mantle p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-ctp-text">{entry.anchorCard} package</h3>
                      {entry.evidenceKinds.map((kind) => <span key={kind} className="rounded-full bg-ctp-surface0 px-2 py-0.5 text-[10px] text-ctp-subtext1">{kind}</span>)}
                    </div>
                    <p className="mt-1 text-sm text-ctp-subtext1">{entry.anchorCard} with {entry.memberCards.join(", ")}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-ctp-base px-3 py-2 text-right">
                      <p className="text-lg font-semibold text-ctp-mauve">{entry.confidenceScore}/100</p>
                      <p className="text-[10px] text-ctp-subtext0">review confidence</p>
                    </div>
                    {isApproved ? (
                      <button type="button" onClick={() => revoke(approvalId)} className="rounded-md border border-ctp-green/50 bg-ctp-green/10 px-3 py-2 text-xs font-semibold text-ctp-green hover:bg-ctp-red/10 hover:text-ctp-red">Approved locally</button>
                    ) : (
                      <button type="button" onClick={() => approve(`${entry.anchorCard} package`, names)} className="rounded-md border border-ctp-mauve/50 px-3 py-2 text-xs font-semibold text-ctp-mauve hover:bg-ctp-mauve/10">Approve locally</button>
                    )}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ["Matches", entry.matchingDecks.toLocaleString()],
                    ["Given anchor", `${(entry.confidence * 100).toFixed(1)}%`],
                    ["Lift", `${entry.lift.toFixed(1)}×`],
                    ["Cohorts", String(entry.championCoverage)],
                  ].map(([label, value]) => <div key={label} className="rounded-lg bg-ctp-base px-3 py-2"><p className="font-semibold text-ctp-text">{value}</p><p className="text-[10px] text-ctp-subtext0">{label}</p></div>)}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {names.map((name) => {
                    const card = cardsByName.get(name);
                    if (!card) return <span key={name} className="rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-1.5 text-xs text-ctp-text">{name}</span>;
                    return (
                      <CardHoverPreview key={name} image={card.editions[0]?.image} alt={name}>
                        <Link to={`/cards/${card.slug}`} className="flex items-center gap-2 rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-1.5 text-xs text-ctp-text hover:border-ctp-blue/50 hover:text-ctp-blue">
                          {card.editions[0] && <CardImage image={card.editions[0].image} alt={name} className="h-9 w-6 rounded object-cover object-top" />}
                          {name}
                        </Link>
                      </CardHoverPreview>
                    );
                  })}
                </div>
                {entry.strongestChampions.length > 0 && <p className="mt-4 text-xs text-ctp-overlay1">Strongest cohorts: {entry.strongestChampions.map((cohort) => `${cohort.championName} (${cohort.matchingDecks})`).join(" · ")}</p>}
                {entry.archetypeSources && entry.archetypeSources.length > 0 && (
                  <div className="mt-3 rounded-lg border border-ctp-surface0 bg-ctp-base/50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Defining-card overlap seen in</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {entry.archetypeSources.map((source) => (
                        <Link key={`${source.buildId}:${source.sectionPattern}`} to={`/archetypes/${source.buildId}`} className="rounded-md bg-ctp-surface0 px-2 py-1 text-xs text-ctp-subtext1 hover:text-ctp-blue">
                          {source.buildName} · {source.sectionPattern} · {(source.prevalence * 100).toFixed(0)}%
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {entry.cautions.length > 0 && <p className="mt-2 text-xs text-ctp-peach">Review caution: {entry.cautions.join("; ")}.</p>}
              </article>
            );
          })}
        </div>
      </section>
    </PageLayout>
  );
}
