import PackageCardGrid from "./PackageCardGrid";
import { SynergyBadge, SynergyFindingEvidence } from "./PackageSynergyReview";
import { findingSynergyStatus } from "@gatcg/shared";
import type { Card, PackageOutcomeBucket, WinRatePackageFinding } from "@gatcg/shared";
import DisclosureChevron from "../../components/DisclosureChevron";
import { LABELS, percent, points, summary } from "./winRatePresentation";

function Bucket({ label, bucket }: { label: string; bucket: PackageOutcomeBucket }) {
  return <div className="min-w-0 rounded-lg bg-ctp-base p-3">
    <p className="text-sm text-ctp-subtext1">{label}</p>
    <p className="text-lg font-semibold">{percent(bucket.winRate)}</p>
    <p className="text-xs text-ctp-subtext0">{bucket.decks.toLocaleString()} decks · {bucket.players.toLocaleString()} players · {bucket.events.toLocaleString()} events</p>
  </div>;
}

export default function PackagePerformanceEvidence({ finding: f, cardsByName }: { finding: WinRatePackageFinding; cardsByName: ReadonlyMap<string, Card> }) {
  const supported = f.validation.sufficient;
  return <article className="min-w-0 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-lg font-semibold">{f.champion} · {f.cards.length}-card package</h3>
        <p className="text-sm text-ctp-subtext1">{f.season} · {f.format}</p>
      </div>
      <span className={`rounded-full border px-3 py-1 text-xs ${f.status === "positive-in-later-events" ? "border-ctp-teal/40 text-ctp-teal" : "border-ctp-surface2 text-ctp-subtext1"}`}>{LABELS[f.status]}</span>
    </div>
    <PackageCardGrid names={f.cards} cardsByName={cardsByName} />
    <div className="mt-3"><SynergyBadge status={findingSynergyStatus(f)} /></div>
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      <Bucket label="Complete package · later win rate" bucket={f.validation.complete} />
      <Bucket label="Missing one or more · later win rate" bucket={f.validation.incomplete} />
    </div>
    <p className="mt-3 text-sm">{supported ? <>Adjusted difference: <strong>{points(f.validation.lift)}</strong> · weakest member difference: <strong>{points(f.validation.weakestMemberLift)}</strong></> : "Insufficient later-event data."}</p>
    <details className="group mt-2 border-t border-ctp-surface1">
      <summary className={summary}>Review synergy <DisclosureChevron className="group-open:rotate-180" /></summary>
      <p className="text-sm text-ctp-subtext1">Later events: {f.validationStarts ?? "Unavailable"}</p>
      <SynergyFindingEvidence finding={f} />
      <p className="mt-3 text-sm text-ctp-subtext1">Earlier discovery: {points(f.discovery.lift)} overall; {points(f.discovery.weakestMemberLift)} weakest member difference. Complete package: {f.discovery.complete.decks} decks, {f.discovery.complete.players} players, {f.discovery.complete.events} events.</p>
      <p className="mt-2 text-sm text-ctp-subtext1">Co-occurrence candidates: {f.existingCandidateOverlap === "exact" ? "an exact card-set match" : f.existingCandidateOverlap === "subset-or-superset" ? "overlaps a subset or superset" : "no exact, subset, or superset match"}.</p>
    </details>
  </article>;
}
