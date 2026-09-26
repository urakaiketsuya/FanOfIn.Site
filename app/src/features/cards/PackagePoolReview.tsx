import { useMemo, useState, useTransition } from "react";
import { groupPackagePools, measurePackageRuleOverlap, type PackageCandidatesData, type PackagePoolGroup, type PackagePoolRelationship } from "@gatcg/shared";
import DisclosureChevron from "../../components/DisclosureChevron";
import { PackageRuleEditor } from "./PackageFamilyReview";
import type { PackageRelationshipEntry } from "./packageRelationshipEntries";
import { useDeckCardIndexData } from "../archetypes/data";
import { usePublishedDataStatus } from "../../lib/sync/usePublishedData";

type Group = PackagePoolGroup<PackageRelationshipEntry>;
const control = "min-h-12 rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-sm focus-visible:outline-2 focus-visible:outline-ctp-teal";
const title = (group: Group) => {
  const labels = [...new Set(group.entries.map((entry) => entry.label))];
  return `${labels.slice(0, 2).join(" / ")}${labels.length > 2 ? ` + ${labels.length - 2} others` : ""}`;
};
const relationLabel = { contained: "Possible subgroup", strong: "Strong overlap", loose: "Related only" };

export default function PackagePoolReview({ entries, query, minedData }: { entries: PackageRelationshipEntry[]; query: string; minedData?: PackageCandidatesData }) {
  const { groups, relationships } = useMemo(() => groupPackagePools(entries), [entries]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const suggested = new Set(relationships.filter((relation) => relation.kind !== "loose").flatMap((relation) => [relation.leftId, relation.rightId]));
  const visible = groups.filter((group) => (!query || [...group.cards, ...group.entries.map((entry) => entry.label)].some((text) => text.toLowerCase().includes(query))) &&
    (filter === "all" || (filter === "same" ? group.entries.length > 1 : suggested.has(group.id))));
  const limited = visible.slice(0, page * 12);
  return <div className="space-y-4">
    <p className="text-sm text-ctp-subtext1">Identical card pools share one listing. Each source keeps its own activation rule. Partial overlaps are suggestions; they never combine or approve rules automatically.</p>
    <div className="flex flex-wrap items-center gap-3"><label className="text-sm">Show <select aria-label="Pool relationship filter" className={control} value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }}><option value="all">All pools</option><option value="same">Same-pool rules</option><option value="suggested">Subgroups and strong overlaps</option></select></label><p className="text-sm text-ctp-subtext0">{visible.length} pools · {visible.reduce((count, group) => count + group.entries.length, 0)} source rules</p></div>
    {visible.length === 0 && <p role="status" className="rounded-lg border border-ctp-surface1 p-4">No card pools match this search and filter.</p>}
    {limited.map((group) => <article key={group.id} className="min-w-0 rounded-xl border border-ctp-teal/30 bg-ctp-mantle p-4">
      <h3 className="text-lg font-semibold break-words">{title(group)}</h3>
      <p className="mt-1 text-sm text-ctp-subtext1">{group.entries.length > 1 ? `Same ${group.cards.length}-card pool · ${group.entries.length} source rules` : `${group.cards.length}-card pool · 1 source rule`}</p>
      <button className={`${control} mt-3 flex w-full items-center justify-between gap-3 text-left text-ctp-teal`} aria-expanded={openId === group.id} onClick={() => setOpenId(openId === group.id ? null : group.id)}>Review pool and relationships<DisclosureChevron className={openId === group.id ? "rotate-180" : ""} /></button>
      {openId === group.id && <PoolDetails group={group} groups={groups} relationships={relationships} minedData={minedData} />}
    </article>)}
    {visible.length > page * 12 && <button className={control} onClick={() => setPage(page + 1)}>Show 12 more pools</button>}
  </div>;
}

function PoolDetails({ group, groups, relationships, minedData }: { group: Group; groups: Group[]; relationships: PackagePoolRelationship[]; minedData?: PackageCandidatesData }) {
  const [pending, startTransition] = useTransition();
  const [ruleId, setRuleId] = useState(group.entries[0].id);
  const [editing, setEditing] = useState(false);
  const [showLoose, setShowLoose] = useState(false);
  const [relationId, setRelationId] = useState("");
  const entry = group.entries.find((item) => item.id === ruleId) ?? group.entries[0];
  const related = relationships.filter((relation) => (relation.leftId === group.id || relation.rightId === group.id) && (showLoose || relation.kind !== "loose"));
  const relation = related.find((item) => `${item.leftId}:${item.rightId}` === relationId);
  const other = relation ? groups.find((item) => item.id === (relation.leftId === group.id ? relation.rightId : relation.leftId)) : undefined;
  return <div className="mt-4 space-y-4" aria-busy={pending}>
    {pending && <p role="status">Recalculating…</p>}
    <div><h4 className="text-sm font-semibold">Shared card pool</h4><ul className="mt-2 grid gap-2 sm:grid-cols-2">{group.cards.map((card) => <li className="min-w-0 break-words rounded-lg bg-ctp-base px-3 py-2 text-sm" key={card}>{card}</li>)}</ul></div>
    <label className="block text-sm font-semibold">Activation rule<select aria-label="Activation rule" value={entry.id} className={`${control} mt-2 w-full max-w-full font-normal`} onChange={(event) => { const value = event.target.value; startTransition(() => { setRuleId(value); setEditing(false); }); }}>{group.entries.map((item, index) => <option value={item.id} key={item.id}>{index + 1}. {item.label} · {item.source}</option>)}</select></label>
    <div className="rounded-lg bg-ctp-base p-3 text-sm"><p className="font-semibold">{entry.source}</p><p className="mt-1 break-words">{entry.activation}</p><p className="mt-2 text-ctp-subtext0">{entry.matches === undefined ? "No published match count" : `${entry.matches.toLocaleString()} matches for this source rule`}</p></div>
    {entry.family && <><button className={control} aria-expanded={editing} onClick={() => setEditing(!editing)}>{editing ? "Close condition editor" : "Edit conditions and review evidence"}</button>{editing && <PackageRuleEditor key={entry.id} family={entry.family} families={minedData?.families ?? []} candidates={minedData?.candidates ?? []} hideRelated />}</>}
    <div className="border-t border-ctp-surface1 pt-4"><h4 className="font-semibold">Related pools</h4><label className="flex min-h-12 items-center gap-3 text-sm"><input type="checkbox" checked={showLoose} onChange={(event) => { setShowLoose(event.target.checked); setRelationId(""); }} />Include loose overlaps (two or more shared cards)</label>
      {related.length === 0 ? <p className="text-sm text-ctp-subtext0">No subgroup or strong-overlap suggestions for this pool.</p> : <label className="block text-sm">Compare a pool<select aria-label="Compare a pool" className={`${control} mt-2 w-full max-w-full`} value={relation ? relationId : ""} onChange={(event) => setRelationId(event.target.value)}><option value="">Choose a relationship…</option>{related.map((item) => { const target = groups.find((candidate) => candidate.id === (item.leftId === group.id ? item.rightId : item.leftId))!; return <option key={target.id} value={`${item.leftId}:${item.rightId}`}>{relationLabel[item.kind]} · {title(target)} · {item.sharedCards.length} shared</option>; })}</select></label>}
    </div>
    {relation && other && <RelationshipDetails key={relationId} relation={relation} current={group} other={other} entry={entry} />}
  </div>;
}

function RelationshipDetails({ relation, current, other, entry }: { relation: PackagePoolRelationship; current: Group; other: Group; entry: PackageRelationshipEntry }) {
  const [pending, startTransition] = useTransition();
  const [otherRuleId, setOtherRuleId] = useState(other.entries[0].id);
  const [measure, setMeasure] = useState(false);
  const target = other.entries.find((item) => item.id === otherRuleId) ?? other.entries[0];
  const sharedMechanics = entry.evidenceKinds.filter((kind) => kind.endsWith(" rules-text link") && kind !== "Named rules-text link" && target.evidenceKinds.includes(kind));
  const champions = entry.champions.filter((name) => target.champions.includes(name));
  const builds = entry.builds.filter((name) => target.builds.includes(name));
  const currentOnly = relation.leftId === current.id ? relation.leftOnly : relation.rightOnly;
  const otherOnly = relation.leftId === current.id ? relation.rightOnly : relation.leftOnly;
  return <div className="space-y-3 rounded-lg border border-ctp-surface1 p-3 text-sm" aria-busy={pending}>
    {pending && <p role="status">Recalculating…</p>}
    <h4 className="font-semibold">{relationLabel[relation.kind]}: {title(other)}</h4>
    {relation.kind === "contained" && <p>{relation.smallerId === current.id ? "This pool is fully contained in the comparison pool." : "The comparison pool is fully contained in this pool."} This suggests a subgroup; the rules still need separate review.</p>}
    <p>{relation.sharedCards.length} shared cards · {(relation.similarity * 100).toFixed(0)}% of combined cards · {(relation.containment * 100).toFixed(0)}% of the smaller pool</p>
    <p><strong>Shared:</strong> {relation.sharedCards.join(", ")}</p><p><strong>Only in this pool ({currentOnly.length}):</strong> {currentOnly.join(", ") || "None"}</p><p><strong>Only in comparison ({otherOnly.length}):</strong> {otherOnly.join(", ") || "None"}</p>
    <label className="block">Comparison rule<select aria-label="Comparison rule" className={`${control} mt-2 w-full max-w-full`} value={target.id} onChange={(event) => { setOtherRuleId(event.target.value); setMeasure(false); }}>{other.entries.map((item, index) => <option key={item.id} value={item.id}>{index + 1}. {item.label} · {item.source}</option>)}</select></label>
    <p>{target.activation}</p>
    <p><strong>Shared mechanical nomination:</strong> {sharedMechanics.join(", ") || "Not established by the available evidence"}</p>
    <p><strong>Shared reported champion cohorts:</strong> {champions.join(", ") || "None reported"}</p>
    <p><strong>Shared reported builds:</strong> {builds.join(", ") || "None reported"}</p>
    <p className="text-ctp-subtext0">Reported cohorts are partial summaries. Shared cards, especially staples, can create overlap without a shared engine. Review rules text and deck evidence before treating these as one package.</p>
    {entry.rule && target.rule ? <><button className={control} onClick={() => startTransition(() => setMeasure(!measure))} aria-expanded={measure}>{measure ? "Hide joint deck evidence" : "Check joint deck evidence"}</button>{measure && <JointEvidence left={entry} right={target} />}</> : <p className="text-ctp-subtext0">Joint counts are unavailable for prose-only rules. Their section requirements are preserved above.</p>}
    <p className="text-xs text-ctp-subtext0">Suggestion thresholds: at least three shared cards and 70% combined-card similarity or 90% smaller-pool containment. Full containment is listed from two cards. These thresholds organize review; they do not establish synergy.</p>
  </div>;
}

export function JointEvidence({ left, right }: { left: Pick<PackageRelationshipEntry, "cards" | "rule">; right: Pick<PackageRelationshipEntry, "cards" | "rule"> }) {
  const data = useDeckCardIndexData();
  const status = usePublishedDataStatus("analysis-deck-card-index", "/data/analysis/deck-card-index.json");
  const result = useMemo(() => {
    if (!data || !left.rule || !right.rule) return null;
    return measurePackageRuleOverlap(data, left.rule, right.rule);
  }, [data, left, right]);
  if (!result) return status.phase === "error" ? <div role="alert">{status.error}<button className={control} onClick={status.retry}>Retry joint evidence</button></div> : <p role="status">Loading joint deck evidence…</p>;
  return <div role="status" className="rounded-lg bg-ctp-base p-3"><p>{result.both.toLocaleString()} decks satisfy both rules across {result.population.toLocaleString()} indexed main + material decks.</p><p>This rule only: {(result.leftCount - result.both).toLocaleString()} · Comparison only: {(result.rightCount - result.both).toLocaleString()}</p><p>{result.union ? `${(100 * result.both / result.union).toFixed(1)}% of decks matching either rule satisfy both.` : "No decks match either rule."} Co-occurrence does not establish synergy or interchangeability.</p><h5 className="mt-3 font-semibold">Shared-card prevalence across the index</h5>{result.population ? <ul className="mt-1 space-y-1">{result.sharedPrevalence.map(([card, count]) => <li key={card}>{card}: {(100 * count / result.population).toFixed(1)}%</li>)}</ul> : <p>No deck population available.</p>}<p className="mt-2 text-ctp-subtext0">High overall prevalence can indicate a staple-driven overlap; these rates are not adjusted for champion or format.</p></div>;
}
