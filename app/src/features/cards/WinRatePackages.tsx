import { useMemo, useState } from "react";
import { indexPackagePerformance, packagePerformanceOwners, winRateRuleKey, type Card, type SavedCardPackage, type SavedPackageRule, type WinRatePackageFinding, type WinRatePackageStatus } from "@gatcg/shared";
import DisclosureChevron from "../../components/DisclosureChevron";
import PackagePerformanceEvidence from "./PackagePerformanceEvidence";
import { useWinRatePackages } from "./useWinRatePackages";
import { LABELS, points, control, summary } from "./winRatePresentation";

export default function WinRatePackages({ query, cardsByName, packages, onReview }: { query: string; cardsByName: ReadonlyMap<string, Card>; packages: SavedCardPackage[]; onReview: (pkg: SavedCardPackage, rule: SavedPackageRule, cohort: string) => void }) {
  const { data, status } = useWinRatePackages();
  const index = useMemo(() => indexPackagePerformance(data), [data]);
  const owners = useMemo(() => packagePerformanceOwners(packages, index), [packages, index]);
  const [display, setDisplay] = useState<"families" | "all">("families");
  const [outcome, setOutcome] = useState<WinRatePackageStatus | "all">("positive-in-later-events");
  const [size, setSize] = useState("all");
  const [page, setPage] = useState({ key: "", count: 20 });
  const filterKey = `${query}|${outcome}|${size}|${display}`;
  const limit = page.key === filterKey ? page.count : 20;
  const findings = useMemo(() => (data?.results ?? []).filter((f) =>
    (outcome === "all" || f.status === outcome) && (size === "all" || f.cards.length === Number(size)) &&
    (!query || [owners.get(winRateRuleKey(f.cards))?.pkg.name ?? "", f.champion, f.season, ...f.cards].some((s) => s.toLowerCase().includes(query))))
    .sort((a, b) => (b.discovery.weakestMemberLift ?? -Infinity) - (a.discovery.weakestMemberLift ?? -Infinity)), [data, query, outcome, size, owners]);
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
    <div>
      <h2 className="text-xl font-semibold">Win-rate findings</h2>
      <p className="mt-2 text-sm text-ctp-subtext1">Groups discovered from match results, compared within the same Champion, format, and season, then checked against later events.</p>
      <p className="mt-2 text-sm text-ctp-peach">Exploratory associations, not proven synergy. Strong players and other deck choices can explain the difference. Performance alone does not approve rules or change recommendations.</p>
    </div>
    {status.phase === "error" && <div role="alert" className="rounded-lg border border-ctp-peach/40 p-3 text-sm">
      <p>{data ? "Showing cached findings. " : "Unable to load win-rate findings. "}{status.error}</p>
      <button type="button" className={`${control} mt-2`} onClick={status.retry}>Retry findings</button>
    </div>}
    {!data && status.phase !== "error" && <p role="status" className="py-6 text-sm">Loading win-rate findings…</p>}
    {data && <>
      <p className="text-sm text-ctp-subtext0">{data.results.length.toLocaleString()} candidates · {data.cohortsTested} cohorts · source snapshot {data.sourceGeneratedAt.slice(0, 10)}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-1 text-sm">Later-event result
          <select className={control} value={outcome} onChange={(e) => setOutcome(e.target.value as typeof outcome)}>
            {(Object.entries(LABELS) as [WinRatePackageStatus, string][]).map(([key, label]) => <option key={key} value={key}>{label} ({data.results.filter((f) => f.status === key).length})</option>)}
            <option value="all">All results ({data.results.length})</option>
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-sm">Package size
          <select className={control} value={size} onChange={(e) => setSize(e.target.value)}>
            <option value="all">Any size</option>{[2, 3, 4].map((n) => <option key={n} value={n}>{n} cards</option>)}
          </select>
        </label>
      </div>
      <details className="group rounded-lg border border-ctp-surface1 px-4">
        <summary className={summary}>How to read these findings <DisclosureChevron className="group-open:rotate-180" /></summary>
        <div className="space-y-2 pb-4 text-sm text-ctp-subtext1">
          <p>Only Main and Material cards count. Complete means every named card is present. Raw win rates average each player’s deck-event rates, giving each player equal weight within a group. “pp” means percentage points.</p>
          <p>Adjusted differences shrink rates toward the cohort average with a {data.settings.priorPlayers}-player prior. Every complete, incomplete, and missing-one group needs at least {data.settings.minDecks} decks, {data.settings.minPlayers} players, and {data.settings.minEvents} events.</p>
          <p>The first 70% of dates discover groups; the remaining dates check them. Discovery requires at least {data.settings.minLift * 100} pp overall and against every missing-one group. “Positive in later events” means all those later differences remain above zero with sufficient samples; it does not mean statistical significance.</p>
          <p>The search is bounded to {data.settings.maxCards} frequent cards and groups of 2–{data.settings.maxSize}, so it can miss packages. Results are ranked by their weakest earlier discovery difference, not their later performance. Players can recur across periods, and no adjustment for testing many groups establishes significance.</p>
        </div>
      </details>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Finding display">
        <button type="button" className={`${control} ${display === "families" ? "border-ctp-blue bg-ctp-blue/10 text-ctp-blue" : ""}`} aria-pressed={display === "families"} onClick={() => setDisplay("families")}>Package families</button>
        <button type="button" className={`${control} ${display === "all" ? "border-ctp-blue bg-ctp-blue/10 text-ctp-blue" : ""}`} aria-pressed={display === "all"} onClick={() => setDisplay("all")}>All findings</button>
      </div>
      <p role="status" className="text-sm text-ctp-subtext0">{findings.length} findings in {families.length} packages · showing {Math.min(limit, total)} {display === "families" ? "packages" : "findings"}. Search also matches Champion and season.</p>
      {total === 0 ? <p className="rounded-lg bg-ctp-mantle p-5 text-sm">No findings match these filters. Try another result, package size, or search.</p> : display === "families" ?
        <div className="space-y-4">{families.slice(0, limit).map(({ pkg, findings: matches }) => {
          const example = matches[0];
          const owner = owners.get(winRateRuleKey(example.cards))!;
          const variants = new Set(matches.map((f) => winRateRuleKey(f.cards))).size;
          const core = example.cards.filter((card) => matches.every((f) => f.cards.includes(card)));
          return <article key={pkg.id} className="min-w-0 space-y-3 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4">
            <h3 className="break-words text-lg font-semibold">{pkg.name}</h3>
            <p className="text-sm text-ctp-subtext1">{variants} matching tested {variants === 1 ? "variant" : "variants"} · {matches.length} cohort findings · {pkg.rules.length} total rules</p>
            <p className="text-sm">{core.length ? `Shared by these variants: ${core.join(", ")}` : "These rules have no shared card core."}</p>
            <div className="space-y-2 rounded-lg bg-ctp-base p-3 text-sm">
              <p className="font-medium">Example ranked by discovery evidence</p>
              <p>{example.cards.join(" + ")}</p>
              <p>{example.champion} · {example.season} · {example.format}</p>
              <p>{LABELS[example.status]}{example.validation.sufficient ? ` · ${points(example.validation.lift)} later adjusted difference` : ""}</p>
              <p className="text-ctp-subtext0">{example.validation.complete.decks} complete / {example.validation.incomplete.decks} incomplete decks. This describes only this exact variant and cohort, not the family.</p>
            </div>
            <p className="text-xs text-ctp-subtext0">Shared cards are an organizing label, not evidence that the core works alone. No pooled family win rate.</p>
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
