import { packageBannedCards } from "./packageArchive";
import PackageCardGrid from "./PackageCardGrid";
import PackageSynergyReview from "./PackageSynergyReview";
import RulePerformance from "./RulePerformance";
import { useWinRatePackages } from "./useWinRatePackages";
import { JointEvidence } from "./PackagePoolReview";
import WinRatePackages from "./WinRatePackages";
import { useCardCatalog } from "./useCardCatalog";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Link, useLocation } from "react-router-dom";
import { includeWinRatePackages, indexPackagePerformance, type PackagePerformanceIndex, type Card, applyPackageAutoPolicy, comparePackagePools, packageAutoEligibility, packageRuleKey, type SavedCardPackage, type SavedPackageRule } from "@gatcg/shared";
import PageLayout from "../../components/layout/PageLayout";
import PageHeader from "../../components/ui/PageHeader";
import Tabs, { TabPanel } from "../../components/ui/Tabs";
import DisclosureChevron from "../../components/DisclosureChevron";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { usePublishedDataStatus } from "../../lib/sync/usePublishedData";
import { getRegisteredDeckPackageCatalog } from "../deckbuilder/packageGuardrails";
import { DECK_PACKAGE_CANDIDATES } from "../deckbuilder/packageCandidates";
import { useMinedPackageCandidates } from "../deckbuilder/useMinedPackageCandidates";
import { mergeSavedPackages, overlaySavedPackages, useSavedPackages, type PackageStore } from "../deckbuilder/savedPackages";
import { buildSuggestedPackages } from "./suggestedPackages";
import { describePackageRule } from "./packageRelationshipEntries";
import { PackageRuleEditor } from "./PackageFamilyReview";

const control = "min-h-12 rounded-lg border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ctp-teal";
const statusLabel = { suggested: "Needs review", manual: "Manually approved", auto: "Auto-approved", registered: "Registered" };
const approved = (pkg: SavedCardPackage) => pkg.rules.some((rule) => rule.status !== "suggested");

export default function PackagesIndex() {
  useDocumentTitle("Card Packages", "Review packages, alternative activation rules, and approval evidence.");
  const location = useLocation();
  const cards = useCardCatalog();
  const cardsByName = useMemo(() => new Map(cards.map((card) => [card.name, card])), [cards]);
  const data = useMinedPackageCandidates();
  const { data: winRateData, status: winRateStatus } = useWinRatePackages();
  const performance = useMemo(() => indexPackagePerformance(winRateData), [winRateData]);
  const loading = usePublishedDataStatus("analysis-package-candidates", "/data/analysis/package-candidates.json");
  const { store, save } = useSavedPackages();
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"suggested" | "approved" | "win-rates" | "archived">(() => location.hash === "#archived" ? "archived" : location.hash === "#win-rates" ? "win-rates" : "suggested");
  useEffect(() => {
    if (location.hash === "#win-rates") setView("win-rates");
    if (location.hash === "#archived") setView("archived");
  }, [location.hash]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [focusPerformanceCohort, setFocusPerformanceCohort] = useState<string | undefined>();
  const [focusRuleId, setFocusRuleId] = useState<string | undefined>();
  const [policyOpen, setPolicyOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pending, startTransition] = useTransition();
  const registered = useMemo(() => getRegisteredDeckPackageCatalog(), []);
  const suggestions = useMemo(() => buildSuggestedPackages(registered, DECK_PACKAGE_CANDIDATES, data), [registered, data]);
  const packages = useMemo(() => includeWinRatePackages(overlaySavedPackages(suggestions, store), winRateData), [suggestions, store, winRateData]);
  const archived = useMemo(() => new Map(packages.map((pkg) => [pkg.id, packageBannedCards(pkg, cardsByName)] as const).filter(([, banned]) => banned.length)), [packages, cardsByName]);
  const handledHash = useRef("");
  useEffect(() => {
    if (!cards.length || !location.hash || location.hash === "#archived" || location.hash === "#win-rates" || handledHash.current === location.hash) return;
    let id: string;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = packages.find((pkg) => pkg.id === id || pkg.sourcePackageIds.includes(id) || pkg.rules.some((rule) => rule.legacyId === id || rule.sourceIds.some((source) => source === id || source === `registered:${id}` || source === `curated:${id}`)));
    if (!target) return;
    handledHash.current = location.hash;
    setView(archived.has(target.id) ? "archived" : approved(target) ? "approved" : "suggested"); setQuery(target.name); setOpenId(target.id);
    requestAnimationFrame(() => document.getElementById(`saved-${encodeURIComponent(target.id)}`)?.scrollIntoView({ block: "start" }));
  }, [location.hash, packages, cards.length, archived]);
  const eligible = packages.flatMap((pkg) => pkg.rules.filter((rule) => rule.status !== "registered" && rule.status !== "manual" && packageAutoEligibility(rule).eligible).map((rule) => ({ pkg, rule })));
  const persist = (next: PackageStore) => { try { save(next); setError(""); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save packages."); } };
  // Enabled policy is re-evaluated when a fresh published audit arrives, and when locally revoked.
  useEffect(() => {
    if (!data || !store.autoEnabled || store.error) return;
    const evaluated = applyPackageAutoPolicy(packages, true);
    const toSave = evaluated.filter((pkg) => store.packages.some((saved) => saved.id === pkg.id) || pkg.rules.some((rule) => rule.status === "auto"));
    if (JSON.stringify(toSave) !== JSON.stringify(store.packages)) {
      try { save({ ...store, packages: toSave }); } catch { setError("Automatic approvals could not be saved. Check browser storage."); }
    }
  }, [data, packages, save, store]);
  const updatePackage = (pkg: SavedCardPackage) => persist({ ...store, undo: undefined, packages: [...store.packages.filter((item) => item.id !== pkg.id), pkg] });
  const changeRule = (pkg: SavedCardPackage, rule: SavedPackageRule, status: "manual" | "suggested") => updatePackage({ ...pkg, rules: pkg.rules.map((item) => item.id === rule.id ? { ...item, status, autoBlocked: status === "suggested", autoChampionCards: undefined, autoMaterialCards: undefined, scope: item.scope ?? "main-material", approvedAt: status === "manual" ? new Date().toISOString() : undefined } : item) });
  const filtered = packages.filter((pkg) => (view === "archived" ? archived.has(pkg.id) : !archived.has(pkg.id) && (view === "approved" ? approved(pkg) : pkg.rules.some((rule) => rule.status === "suggested"))) && (!query.trim() || [pkg.name, ...pkg.cards, ...pkg.rules.map((rule) => rule.label)].some((value) => value.toLowerCase().includes(query.trim().toLowerCase()))));
  const organize = (left: SavedCardPackage, right: SavedCardPackage, action: "merge" | "subpackage") => {
    if (action === "merge") {
      const merged = mergeSavedPackages(left, right);
      // Repoint any parent links, without making child approval inherit from its parent.
      const others = store.packages.filter((pkg) => pkg.id !== left.id && pkg.id !== right.id).map((pkg) => ({ ...pkg, subpackageIds: [...new Set(pkg.subpackageIds.map((id) => id === right.id ? left.id : id))].filter((id) => id !== pkg.id) }));
      persist({ ...store, undo: store.packages, packages: [...others, merged] });
    } else {
      if (right.cards.length >= left.cards.length || !right.cards.every((card) => left.cards.includes(card))) { setError("A subpackage must be a strictly smaller contained card pool."); return; }
      persist({ ...store, undo: store.packages, packages: [...store.packages.filter((pkg) => pkg.id !== left.id && pkg.id !== right.id), { ...left, subpackageIds: [...new Set([...left.subpackageIds, right.id])] }, right] });
    }
  };
  return <PageLayout width="wide"><PageHeader title="Card Packages" actions={<Link className="min-h-12 py-3 text-ctp-teal" to="/combo-lab">Open Combo Lab</Link>} />
    {(store.error || error) && <p role="alert" className="rounded-lg border border-ctp-red p-3">{store.error || error}</p>}
    <label className="block text-sm">Find a package or card<input type="search" className={`${control} mt-2 w-full`} value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Portly Raccoon, Argus…" /></label>
    <section hidden={view === "win-rates" || view === "archived"} className="mt-4 rounded-lg border border-ctp-surface1 p-3"><button className="flex min-h-12 w-full items-center justify-between gap-3 text-left text-sm font-semibold" aria-expanded={policyOpen} onClick={() => setPolicyOpen(!policyOpen)}>Automatic approval · {store.autoEnabled ? "Enabled" : "Dry run"} · {eligible.length} qualifying rules<DisclosureChevron className={policyOpen ? "rotate-180" : ""} /></button>
      {policyOpen && <div className="space-y-3 text-sm">{eligible.length > 0 ? <div className="space-y-2"><h3 className="font-semibold">Qualifying rules</h3>{eligible.map(({ pkg, rule }) => <button key={`${pkg.id}:${rule.id}`} className={`${control} block w-full break-words text-left`} onClick={() => { setQuery(pkg.name); setView(archived.has(pkg.id) ? "archived" : "suggested"); setOpenId(pkg.id); setFocusRuleId(rule.id); setPolicyOpen(false); }}>Review {pkg.name}: {rule.conditions ? describePackageRule(rule.conditions) : rule.activation}</button>)}</div> : <p>No qualifying rules.</p>}<button disabled={!data || !!store.error} className={`${control} text-ctp-teal disabled:opacity-40`} onClick={() => startTransition(() => {
        const enabled = !store.autoEnabled;
        const evaluated = applyPackageAutoPolicy(packages, enabled);
        persist({ ...store, undo: undefined, autoEnabled: enabled, packages: evaluated.filter((pkg) => store.packages.some((saved) => saved.id === pkg.id) || pkg.rules.some((rule) => rule.status === "auto")) });
      })}>{store.autoEnabled ? "Disable automatic approval" : "Enable automatic approval"}</button>{pending && <p role="status">Recalculating approvals…</p>}</div>}
    </section>
    {store.undo && <button className={`${control} mt-3`} onClick={() => persist({ ...store, packages: store.undo!, undo: undefined })}>Undo last organization change</button>}
    <div className="mt-4 [&_[role=tab]]:min-h-12 [&_[role=tablist]]:flex-wrap"><Tabs baseId="packages" label="Package review status" tabs={[{ key: "suggested", label: "Suggested packages" }, { key: "approved", label: "Approved packages" }, { key: "win-rates", label: "Win-rate findings" }, { key: "archived", label: "Archived" }]} active={view} onChange={(next) => { setView(next); setPage(1); }} /></div>
    {view !== "win-rates" && !data && (loading.phase === "error" ? <p role="alert">{loading.error}<button className={control} onClick={loading.retry}>Retry package evidence</button></p> : <p role="status" className="mt-3">Loading package evidence…</p>)}
    <TabPanel baseId="packages" tab="win-rates" active={view}>
      <WinRatePackages query={query.trim().toLowerCase()} cardsByName={cardsByName} packages={packages} onReview={(pkg, rule, cohort) => {
        setView(archived.has(pkg.id) ? "archived" : rule.status === "suggested" ? "suggested" : "approved"); setQuery(pkg.name); setPage(1); setOpenId(pkg.id); setFocusRuleId(rule.id); setFocusPerformanceCohort(cohort);
        requestAnimationFrame(() => document.getElementById(`saved-${encodeURIComponent(pkg.id)}`)?.scrollIntoView({ block: "start" }));
      }} />
    </TabPanel>
    {view !== "win-rates" && !winRateData && (winRateStatus.phase === "error" ? <p role="alert">Win-rate evidence unavailable. {winRateStatus.error} <button className={control} onClick={winRateStatus.retry}>Retry findings</button></p> : <p role="status">Loading win-rate package suggestions and evidence…</p>)}
    {view !== "win-rates" && <TabPanel baseId="packages" tab={view} active={view} className="mt-4 space-y-4">
      <p className="text-sm text-ctp-subtext0">{filtered.length} packages</p>
      {!filtered.length && <p role="status">No packages match this view and search.</p>}
      {filtered.slice(0, page * 12).map((pkg) => <article id={`saved-${encodeURIComponent(pkg.id)}`} key={pkg.id} className="scroll-mt-32 min-w-0 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4">
        <h2 className="break-words text-lg font-semibold">{pkg.name}</h2><p className="mt-1 text-sm text-ctp-subtext0">{pkg.cards.length} cards · {pkg.rules.filter((rule) => rule.status !== "suggested").length} approved rules · {pkg.rules.filter((rule) => rule.status === "suggested").length} need review</p>
        {archived.has(pkg.id) && <p className="mt-2 break-words text-sm text-ctp-peach">Banned in Standard: {archived.get(pkg.id)!.join(", ")}</p>}
        <p className="mt-3 text-sm text-ctp-subtext1">Card pool</p>
        <PackageCardGrid names={pkg.cards} cardsByName={cardsByName} />
        <PackageSynergyReview pkg={pkg} index={performance} cardsByName={cardsByName} loading={!winRateData && winRateStatus.phase !== "error"} error={!winRateData && winRateStatus.phase === "error"} />
        <button className={`${control} mt-3 flex w-full items-center justify-between text-left text-ctp-teal`} aria-expanded={openId === pkg.id} onClick={() => setOpenId(openId === pkg.id ? null : pkg.id)}>Review package<DisclosureChevron className={openId === pkg.id ? "rotate-180" : ""} /></button>
        {openId === pkg.id && <PackageDetails key={`${pkg.id}:${focusRuleId ?? ""}:${focusPerformanceCohort ?? ""}`} initialPerformanceCohort={focusPerformanceCohort} initialRuleId={focusRuleId} performance={performance} cardsByName={cardsByName} pkg={pkg} packages={packages} data={data} onSave={updatePackage} onRule={changeRule} onOrganize={organize} />}
      </article>)}
      {filtered.length > page * 12 && <button className={control} onClick={() => setPage(page + 1)}>Show 12 more packages</button>}
    </TabPanel>}
  </PageLayout>;
}

function PackageDetails({ pkg, packages, data, onSave, onRule, onOrganize, initialRuleId, performance, cardsByName, initialPerformanceCohort }: { initialPerformanceCohort?: string; performance: PackagePerformanceIndex; cardsByName: ReadonlyMap<string, Card>; initialRuleId?: string; pkg: SavedCardPackage; packages: SavedCardPackage[]; data: ReturnType<typeof useMinedPackageCandidates>; onSave: (pkg: SavedCardPackage) => void; onRule: (pkg: SavedCardPackage, rule: SavedPackageRule, status: "manual" | "suggested") => void; onOrganize: (left: SavedCardPackage, right: SavedCardPackage, action: "merge" | "subpackage") => void }) {
  const [name, setName] = useState(pkg.name);
  const [selected, setSelected] = useState(initialRuleId ?? pkg.rules[0]?.id);
  const [sourceFindings, setSourceFindings] = useState(!!pkg.rules.find((item) => item.id === initialRuleId)?.supporting);
  const [editing, setEditing] = useState(false);
  const [relatedId, setRelatedId] = useState("");
  const [comparisonRuleId, setComparisonRuleId] = useState("");
  const [joint, setJoint] = useState(false);
  const [mode, setMode] = useState<"rules" | "relationships">("rules");
  const rules = pkg.rules.filter((rule) => sourceFindings || !rule.supporting || rule.status !== "suggested");
  const available = rules.length ? rules : pkg.rules;
  const rule = available.find((item) => item.id === selected) ?? available[0];
  const eligibility = rule ? packageAutoEligibility(rule) : null;
  const family = data?.families.find((item) => rule?.conditions && packageRuleKey({ requiredCards: [item.anchorCard, ...item.coreCards], groups: [{ cards: item.optionCards, minimum: item.minOptions }] }) === packageRuleKey(rule.conditions));
  const related = packages.filter((other) => other.id !== pkg.id).map((other) => ({ other, relationship: comparePackagePools({ id: pkg.id, cards: pkg.cards }, { id: other.id, cards: other.cards }) })).filter((item) => item.relationship);
  const target = related.find((item) => item.other.id === relatedId);
  const comparisonRule = target?.other.rules.find((item) => item.id === comparisonRuleId) ?? target?.other.rules[0];
  return <div className="mt-4 space-y-4 text-sm">
    <details className="group rounded-lg border border-ctp-surface1 px-3">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 focus-visible:outline-2 focus-visible:outline-ctp-teal">Rename package<DisclosureChevron className="group-open:rotate-180" /></summary>
      <div className="space-y-3 pb-3"><label className="block">Package name<input className={`${control} mt-1 w-full`} value={name} onChange={(event) => setName(event.target.value)} /></label><button className={control} disabled={!name.trim()} onClick={() => onSave({ ...pkg, name: name.trim() })}>Save package name</button></div>
    </details>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Package detail view"><button className={control} aria-pressed={mode === "rules"} onClick={() => setMode("rules")}>Rules and evidence</button><button className={control} aria-pressed={mode === "relationships"} onClick={() => setMode("relationships")}>Related packages ({related.length})</button></div>
    {mode === "rules" && rule && <>
      <label className="flex min-h-12 items-center gap-3"><input type="checkbox" checked={sourceFindings} onChange={(event) => setSourceFindings(event.target.checked)} />Show source findings ({pkg.rules.filter((item) => item.supporting).length})</label>
      <label className="block">Activation rule<select aria-label="Activation rule" className={`${control} mt-1 w-full max-w-full`} value={rule.id} onChange={(event) => { setSelected(event.target.value); setEditing(false); }}>{available.map((item, index) => <option key={item.id} value={item.id}>{index + 1}. {item.label} · {statusLabel[item.status]}</option>)}</select></label>
      <div className="space-y-2 rounded-lg bg-ctp-base p-3"><p className="font-semibold">{statusLabel[rule.status]} · {rule.source}</p><p>{rule.conditions ? describePackageRule(rule.conditions) : rule.activation}</p>{rule.scope === "legacy-any-section" && <p>Legacy approval: its original section behavior is preserved, including sideboard presence.</p>}{rule.status === "auto" && <p>Automatic protection is limited to qualifying champion cards in Material: {rule.autoChampionCards?.join(", ")}. Required Material members: {rule.autoMaterialCards?.join(", ") || "None"}.</p>}</div>
      <RulePerformance key={rule.id} initialCohort={initialPerformanceCohort} rule={rule} index={performance} cardsByName={cardsByName} />
      {rule.status !== "registered" && <div className="space-y-2"><h3 className="font-semibold">Auto-approval eligibility</h3><p>{eligibility?.eligible ? "Qualifies under policy v1" : "Does not qualify for automatic approval"}</p><ul className="list-inside list-disc">{eligibility?.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>{rule.evidence && <><p>{rule.evidence.verification}</p><p>Evidence generated {rule.evidence.generatedAt}.</p><div className="grid gap-2 sm:grid-cols-2">{rule.evidence.cohorts.filter((cohort) => cohort.matchingDecks > 0).slice(0, 6).map((cohort) => <div className="rounded bg-ctp-base p-3" key={cohort.championName}>{cohort.championName}: {cohort.matchingDecks} matches / {cohort.matchingEvents} events · {(100 * cohort.confidence).toFixed(1)}% · {cohort.lift.toFixed(2)}× lift</div>)}</div></>}</div>}
      <div className="flex flex-wrap gap-2">{rule.conditions && rule.status === "suggested" && <button className={`${control} text-ctp-teal`} onClick={() => onRule(pkg, rule, "manual")}>Approve this rule manually</button>}{(rule.status === "manual" || rule.status === "auto") && <button className={`${control} text-ctp-red`} onClick={() => onRule(pkg, rule, "suggested")}>Revoke this rule</button>}{rule.autoBlocked && <button className={control} onClick={() => onSave({ ...pkg, rules: pkg.rules.map((item) => item.id === rule.id ? { ...item, autoBlocked: false } : item) })}>Allow policy to reconsider this rule</button>}</div>
      {!rule.conditions && rule.status !== "registered" && <p>Review only · executable rule required.</p>}
      {family && <><button className={control} aria-expanded={editing} onClick={() => setEditing(!editing)}>{editing ? "Close condition editor" : "Edit conditions"}</button>{editing && <PackageRuleEditor key={rule.id} family={family} families={data?.families ?? []} candidates={data?.candidates ?? []} hideRelated packageId={pkg.id} />}</>}
    </>}
    {mode === "relationships" && <>
      {pkg.subpackageIds.length > 0 && <div><h3 className="font-semibold">Saved subpackages</h3>{pkg.subpackageIds.map((id) => <div key={id} className="flex flex-wrap items-center gap-2"><span>{packages.find((item) => item.id === id)?.name ?? "Unavailable package"}</span><button className={control} onClick={() => onSave({ ...pkg, subpackageIds: pkg.subpackageIds.filter((child) => child !== id) })}>Unlink subpackage</button></div>)}</div>}
      {related.length === 0 ? <p>No related packages found.</p> : <label className="block">Compare package<select aria-label="Compare package" className={`${control} mt-1 w-full max-w-full`} value={target ? relatedId : ""} onChange={(event) => { setRelatedId(event.target.value); setComparisonRuleId(""); setJoint(false); }}><option value="">Choose a package…</option>{related.map(({ other, relationship }) => <option key={other.id} value={other.id}>{other.name} · {relationship!.kind === "contained" ? "Possible subpackage" : relationship!.kind === "strong" ? "Strong overlap" : "Related only"} · {relationship!.sharedCards.length} shared</option>)}</select></label>}
      {target && <div className="space-y-3 rounded-lg border border-ctp-surface1 p-3"><p>{target.relationship!.sharedCards.length} shared · {(100 * target.relationship!.similarity).toFixed(0)}% overall similarity · {(100 * target.relationship!.containment).toFixed(0)}% smaller-pool containment</p><p>Shared: {target.relationship!.sharedCards.join(", ")}</p><p>Only in this package: {target.relationship!.leftOnly.join(", ") || "None"}</p><p>Only in comparison: {target.relationship!.rightOnly.join(", ") || "None"}</p>{comparisonRule && <><label className="block">Comparison activation rule<select aria-label="Comparison activation rule" className={`${control} mt-1 w-full max-w-full`} value={comparisonRule.id} onChange={(event) => { setComparisonRuleId(event.target.value); setJoint(false); }}>{target.other.rules.map((item, index) => <option key={item.id} value={item.id}>{index + 1}. {item.label} · {statusLabel[item.status]}</option>)}</select></label><p>{comparisonRule.conditions ? describePackageRule(comparisonRule.conditions) : comparisonRule.activation}</p>{rule?.conditions && comparisonRule.conditions && <><button className={control} aria-expanded={joint} onClick={() => setJoint(!joint)}>{joint ? "Hide joint evidence" : "Check joint deck evidence"}</button>{joint && <JointEvidence left={{ cards: rule.cards, rule: rule.conditions }} right={{ cards: comparisonRule.cards, rule: comparisonRule.conditions }} />}</>}</>}
      <h3 className="font-semibold">Merge preview</h3><p>{mergeSavedPackages(pkg, target.other).cards.length} cards · {mergeSavedPackages(pkg, target.other).rules.length} distinct rules.</p><ul className="max-h-64 space-y-2 overflow-auto" tabIndex={0} aria-label="Rules retained after merge">{target.other.rules.map((item) => <li key={item.id}>{item.conditions ? describePackageRule(item.conditions) : item.activation} — {statusLabel[item.status]}</li>)}</ul><div className="flex flex-wrap gap-2">{target.relationship!.kind !== "loose" && <button className={control} onClick={() => { onOrganize(pkg, target.other, "merge"); setRelatedId(""); }}>Merge these packages</button>}{target.other.cards.length < pkg.cards.length && target.other.cards.every((card) => pkg.cards.includes(card)) && <button className={control} onClick={() => onOrganize(pkg, target.other, "subpackage")}>Save as subpackage</button>}</div>{target.relationship!.kind === "loose" && <p>Merge unavailable: insufficient overlap.</p>}</div>}
    </>}
  </div>;
}
