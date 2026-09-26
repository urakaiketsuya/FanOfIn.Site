import { packageBannedCards } from "./packageArchive";
import PackageCardGrid from "./PackageCardGrid";
import PackageSynergyReview from "./PackageSynergyReview";
import { useMemo, useState } from "react";
import { indexPackagePerformance, packagePerformanceOwners, winRateRuleKey, type Card, type SavedCardPackage, type SavedPackageRule, type WinRatePackageFinding, type WinRatePackageStatus } from "@gatcg/shared";
import PackagePerformanceEvidence from "./PackagePerformanceEvidence";
import { useWinRatePackages } from "./useWinRatePackages";
import { LABELS, control } from "./winRatePresentation";

export default function WinRatePackages({ query, cardsByName, packages, onReview }: { query: string; cardsByName: ReadonlyMap<string, Card>; packages: SavedCardPackage[]; onReview: (pkg: SavedCardPackage, rule: SavedPackageRule, cohort: string) => void }) {
  const { data, status } = useWinRatePackages();
  const index = useMemo(() => indexPackagePerformance(data), [data]);
  const owners = useMemo(() => packagePerformanceOwners(packages, index), [packages, index]);
  const activeResults = useMemo(() => (data?.results ?? []).filter((finding) => {
    const owner = owners.get(winRateRuleKey(finding.cards));
    return !packageBannedCards(owner?.pkg ?? finding, cardsByName).length;
  }), [data, owners, cardsByName]);
  const [display, setDisplay] = useState<"families" | "all">("families");
  const [outcome, setOutcome] = useState<WinRatePackageStatus | "all">("positive-in-later-events");
  const [size, setSize] = useState("all");
  const [page, setPage] = useState({ key: "", count: 20 });
  const filterKey = `${query}|${outcome}|${size}|${display}`;
  const limit = page.key === filterKey ? page.count : 20;
  const findings = useMemo(() => activeResults.filter((f) =>
    (outcome === "all" || f.status === outcome) && (size === "all" || f.cards.length === Number(size)) &&
    (!query || [owners.get(winRateRuleKey(f.cards))?.pkg.name ?? "", f.champion, f.season, ...f.cards].some((s) => s.toLowerCase().includes(query))))
    .sort((a, b) => (b.discovery.weakestMemberLift ?? -Infinity) - (a.discovery.weakestMemberLift ?? -Infinity)), [activeResults, query, outcome, size, owners]);
  const families = useMemo(() => {
    const groups = new Map<string, { pkg: SavedCardPackage; findings: WinRatePackageFinding[] }>();
    for (const finding of findings) {
      const owner = owners.get(winRateRuleKey(finding.cards));
      if (!owner) continue;
      const group = groups.get(owner.pkg.id) ?? { pkg: owner.pkg, findings: [] };
      group.findings.push(finding); groups.set(owner.pkg.id, group);
    }
    return [...groups.values()];
  }, [findings, owners]);
  const total = display === "families" ? families.length : findings.length;
  return <section className="mt-4 space-y-4" aria-label="Win-rate package findings">
    <h2 className="text-xl font-semibold">Win-rate findings</h2>
    {status.phase === "error" && <div role="alert" className="rounded-lg border border-ctp-peach/40 p-3 text-sm">
      <p>{data ? "Showing cached findings. " : "Unable to load win-rate findings. "}{status.error}</p>
      <button type="button" className={`${control} mt-2`} onClick={status.retry}>Retry findings</button>
    </div>}
    {!data && status.phase !== "error" && <p role="status" className="py-6 text-sm">Loading win-rate findings…</p>}
    {data && <>
      <p className="text-sm text-ctp-subtext0">{activeResults.length.toLocaleString()} candidates · {data.cohortsTested} cohorts · source snapshot {data.sourceGeneratedAt.slice(0, 10)}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-1 text-sm">Later-event result
          <select className={control} value={outcome} onChange={(e) => setOutcome(e.target.value as typeof outcome)}>
            {(Object.entries(LABELS) as [WinRatePackageStatus, string][]).map(([key, label]) => <option key={key} value={key}>{label} ({activeResults.filter((f) => f.status === key).length})</option>)}
            <option value="all">All results ({activeResults.length})</option>
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-sm">Package size
          <select className={control} value={size} onChange={(e) => setSize(e.target.value)}>
            <option value="all">Any size</option>{[2, 3, 4].map((n) => <option key={n} value={n}>{n} cards</option>)}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Finding display">
        <button type="button" className={`${control} ${display === "families" ? "border-ctp-blue bg-ctp-blue/10 text-ctp-blue" : ""}`} aria-pressed={display === "families"} onClick={() => setDisplay("families")}>Package families</button>
        <button type="button" className={`${control} ${display === "all" ? "border-ctp-blue bg-ctp-blue/10 text-ctp-blue" : ""}`} aria-pressed={display === "all"} onClick={() => setDisplay("all")}>All findings</button>
      </div>
      <p role="status" className="text-sm text-ctp-subtext0">{findings.length} findings in {families.length} packages · showing {Math.min(limit, total)} {display === "families" ? "packages" : "findings"}</p>
      {total === 0 ? <p className="rounded-lg bg-ctp-mantle p-5 text-sm">No findings match these filters. Try another result, package size, or search.</p> : display === "families" ?
        <div className="space-y-4">{families.slice(0, limit).map(({ pkg, findings: matches }) => {
          const example = matches[0];
          const owner = owners.get(winRateRuleKey(example.cards))!;
          const variants = new Set(matches.map((f) => winRateRuleKey(f.cards))).size;
          const core = example.cards.filter((card) => matches.every((f) => f.cards.includes(card)));
          return <article key={pkg.id} className="min-w-0 space-y-3 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4">
            <h3 className="break-words text-lg font-semibold">{pkg.name}</h3>
            <p className="text-sm text-ctp-subtext1">Card pool</p>
            <PackageCardGrid names={pkg.cards} cardsByName={cardsByName} />
            <p className="text-sm text-ctp-subtext1">{variants} matching tested {variants === 1 ? "variant" : "variants"} · {matches.length} cohort findings · {pkg.rules.length} total rules</p>
            <p className="text-sm">{core.length ? `Shared by these variants: ${core.join(", ")}` : "No shared cards"}</p>
            <PackageSynergyReview pkg={pkg} index={index} cardsByName={cardsByName} />
            <button type="button" className={control} onClick={() => onReview(pkg, owner.rule, example.cohort)}>Review performance and rules</button>
          </article>;
        })}</div> :
        <div className="space-y-4">{findings.slice(0, limit).map((finding) => {
          const owner = owners.get(winRateRuleKey(finding.cards));
          return <div key={JSON.stringify([finding.cohort, finding.cards])}>
            <PackagePerformanceEvidence finding={finding} cardsByName={cardsByName} />
            {owner && <button type="button" className={`${control} mt-2`} onClick={() => onReview(owner.pkg, owner.rule, finding.cohort)}>Review this package and rule</button>}
          </div>;
        })}</div>}
      {total > limit && <button type="button" className={control} onClick={() => setPage({ key: filterKey, count: limit + 20 })}>Show 20 more {display === "families" ? "packages" : "findings"}</button>}
    </>}
  </section>;
}
