import { useState } from "react";
import { Link } from "react-router-dom";
import { findingSynergyStatus, hasPackageSupport, namedRulesTextSeeds, packageRulePerformance, summarizePackageSynergy, verifiedPackageMechanics, type Card, type PackagePerformanceIndex, type PackageSynergyStatus, type SavedCardPackage, type WinRatePackageFinding } from "@gatcg/shared";
import DisclosureChevron from "../../components/DisclosureChevron";
import { control, percent, points, summary } from "./winRatePresentation";

export function SynergyBadge({ status }: { status: PackageSynergyStatus }) {
  return <span className={`inline-block rounded-full border px-3 py-1 text-xs ${status === "Supported" ? "border-ctp-teal/40 text-ctp-teal" : status === "Mixed" ? "border-ctp-peach/40 text-ctp-peach" : "border-ctp-surface2 text-ctp-subtext1"}`}>Synergy evidence: {status}</span>;
}

export function SynergyFindingEvidence({ finding }: { finding: WinRatePackageFinding }) {
  const comparison = finding.validation;
  return <div className="space-y-4 text-sm">
    <div>
      <h4 className="font-semibold">Member contribution · later events</h4>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">{comparison.missingOne.map((member) => {
        const enough = hasPackageSupport(comparison.complete) && hasPackageSupport(member.bucket) && member.lift !== null;
        return <li key={member.card} className="min-w-0 rounded-lg bg-ctp-base p-3">
          <p className="break-words font-medium">{member.card}</p>
          <p>{!enough ? "Unproven · insufficient data" : member.lift! > 0 ? "Positive contribution observed" : "No positive contribution observed"}</p>
          {enough && <p>{points(member.lift)} · complete combination vs. without this card</p>}
          <p className="mt-1 text-xs text-ctp-subtext0">Without this card: {member.bucket.decks} decks · {member.bucket.players} players · {member.bucket.events} events</p>
        </li>;
      })}</ul>
    </div>
    <div>
      <h4 className="font-semibold">Interaction benefit · later events</h4>
      {!finding.interactions?.length ? <p className="mt-2">Unproven · interaction has not been tested in this snapshot.</p> : <ul className="mt-2 space-y-3">{finding.interactions.map((item) => <li key={item.card} className="min-w-0 rounded-lg border border-ctp-surface1 p-3">
        <p className="break-words font-medium">{item.card} + {item.core.join(" + ")}</p>
        <p>{item.sufficient && item.interval ? `${points(item.difference)} beyond individual benefits` : "Unproven · insufficient comparison data"}</p>
        {item.interval && <p className="text-ctp-subtext0">Approximate 95% interval: {points(item.interval[0])} to {points(item.interval[1])}</p>}
        <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">{item.buckets.map((bucket, i) => <div key={i} className="rounded bg-ctp-base p-2">
          <dt className="break-words">{["Complete combination", `Only ${item.core.join(" + ")}`, `Only ${item.card}`, "Neither side"][i]}</dt>
          <dd>{percent(bucket.winRate)} · {bucket.decks} decks</dd>
          <dd className="text-xs text-ctp-subtext0">{bucket.players} players · {bucket.events} events</dd>
        </div>)}</dl>
      </li>)}</ul>}
      <p className="mt-2 text-xs text-ctp-subtext0">Deck-inclusion association within this champion, format and season. Intervals account for repeat players. Partial cores are excluded.</p>
    </div>
  </div>;
}

export default function PackageSynergyReview({ pkg, index, cardsByName, loading = false, error = false }: {
  pkg: SavedCardPackage; index: PackagePerformanceIndex; cardsByName: ReadonlyMap<string, Card>; loading?: boolean; error?: boolean;
}) {
  const [selectedRule, setSelectedRule] = useState("");
  const [selectedCohort, setSelectedCohort] = useState("");
  const rule = pkg.rules.find((item) => item.id === selectedRule) ?? pkg.rules[0];
  const findings = rule ? packageRulePerformance(rule, index) : [];
  const finding = findings.find((item) => item.cohort === selectedCohort) ?? findings[0];
  const statuses = pkg.rules.flatMap((item) => {
    const results = packageRulePerformance(item, index);
    return results.length ? results.map(findingSynergyStatus) : ["Unproven" as const];
  });
  const names = rule?.conditions ? [...new Set([...rule.conditions.requiredCards, ...rule.conditions.groups.flatMap((group) => group.cards)])] : rule?.cards ?? [];
  const catalog = names.flatMap((name) => { const card = cardsByName.get(name); return card ? [card] : []; });
  const links = namedRulesTextSeeds(catalog).filter((seed) => seed.memberCards.length === 1);
  const verified = rule && verifiedPackageMechanics(rule);
  return <section className="mt-3" aria-label="Package synergy">
    {loading ? <p role="status" className="text-sm">Loading synergy evidence…</p> : error ? <p className="text-sm text-ctp-peach">Synergy evidence unavailable</p> : <SynergyBadge status={summarizePackageSynergy(statuses)} />}
    <details className="group mt-2 border-t border-ctp-surface1">
      <summary className={summary}>Review synergy<DisclosureChevron className="group-open:rotate-180" /></summary>
      <div className="space-y-4 pb-3 text-sm">
        {!rule ? <p>No rules to assess.</p> : <>
          <label className="block">Exact rule
            <select aria-label="Exact rule" className={`${control} mt-1 w-full min-w-0 max-w-full`} value={rule.id} onChange={(event) => { setSelectedRule(event.target.value); setSelectedCohort(""); }}>
              {pkg.rules.map((item, i) => <option key={item.id} value={item.id}>{i + 1}. {item.label}</option>)}
            </select>
          </label>
          <div className="space-y-2">
            <h4 className="font-semibold">Mechanical relationship · {verified ? "Verified" : links.length ? "Text links found" : "Unverified"}</h4>
            {verified && <p>{rule.evidence!.verification}</p>}
            {!!links.length && <ul className="space-y-1">{links.map((seed) => <li key={`${seed.anchorCard}:${seed.memberCards[0]}`} className="break-words">{seed.anchorCard} names {seed.memberCards[0]} in its rules text.</li>)}</ul>}
            {!verified && !links.length && <p>No verified mechanical relationship recorded.</p>}
          </div>
          <div>
            <h4 className="font-semibold">Roles in this rule</h4>
            <ul className="mt-2 space-y-1">{names.map((name) => <li key={name} className="flex min-w-0 flex-wrap items-center gap-x-2">
              {cardsByName.has(name) ? <Link className="inline-flex min-h-12 items-center break-words rounded px-1 text-ctp-blue underline focus-visible:outline-2" to={`/cards/${cardsByName.get(name)!.slug}`}>{name}</Link> : <span className="break-words">{name}</span>}
              <span className="text-ctp-subtext0">{rule.conditions?.requiredCards.includes(name) ? "Required by rule" : rule.conditions?.groups.filter((group) => group.cards.includes(name)).map((group) => `Choose ${group.minimum} of ${group.cards.length}`).join(" · ") || "Role unspecified"}</span>
            </li>)}</ul>
          </div>
          {!finding ? <p>{loading ? "Loading performance evidence…" : error ? "Performance evidence unavailable." : "Unproven · no performance evidence for this exact rule."}</p> : <>
            <label className="block">Synergy cohort<select aria-label="Synergy cohort" className={`${control} mt-1 w-full min-w-0 max-w-full`} value={finding.cohort} onChange={(event) => setSelectedCohort(event.target.value)}>
              {findings.map((item) => <option key={item.cohort} value={item.cohort}>{item.champion} · {item.season} · {item.format}</option>)}
            </select></label>
            <SynergyBadge status={findingSynergyStatus(finding)} />
            <p className="text-ctp-subtext0">Complete combination: {finding.validation.complete.decks} decks · {finding.validation.complete.players} players · {finding.validation.complete.events} events</p>
            <SynergyFindingEvidence finding={finding} />
          </>}
        </>}
      </div>
    </details>
  </section>;
}
