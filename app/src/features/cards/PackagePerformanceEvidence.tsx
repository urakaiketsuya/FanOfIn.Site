import { Link } from "react-router-dom";
import type { Card, PackageOutcomeBucket, WinRatePackageFinding } from "@gatcg/shared";
import DisclosureChevron from "../../components/DisclosureChevron";
import { LABELS, percent, points, control, summary } from "./winRatePresentation";

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
    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
      {f.cards.map((name) => {
        const card = cardsByName.get(name);
        return <li key={name} className="min-w-0">{card ? <Link to={`/cards/${card.slug}`} className={`${control} flex items-center hover:border-ctp-blue break-words`}>{name}</Link> : <span className="flex min-h-12 items-center rounded-md bg-ctp-base px-3 py-2 text-sm break-words">{name}</span>}</li>;
      })}
    </ul>
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      <Bucket label="Complete package · later win rate" bucket={f.validation.complete} />
      <Bucket label="Missing one or more · later win rate" bucket={f.validation.incomplete} />
    </div>
    <p className="mt-3 text-sm">{supported ? <>Adjusted difference: <strong>{points(f.validation.lift)}</strong> · weakest member difference: <strong>{points(f.validation.weakestMemberLift)}</strong></> : "Too little later-event evidence to assess this package. Raw rates above are descriptive only."}</p>
    <details className="group mt-2 border-t border-ctp-surface1">
      <summary className={summary}>Comparison evidence <DisclosureChevron className="group-open:rotate-180" /></summary>
      <p className="text-sm text-ctp-subtext1">Later events start {f.validationStarts ?? "on an unavailable date"}. Each missing-one group contains all other package cards and excludes the named card.</p>
      <ul className="mt-3 space-y-2">
        {f.validation.missingOne.map((m) => <li key={m.card} className="rounded-lg bg-ctp-base p-3 text-sm">
          <p className="font-medium">Without {m.card}</p>
          <p className="mt-1">{percent(m.bucket.winRate)} raw win rate · {points(m.lift)} adjusted difference for the complete package</p>
          <p className="mt-1 text-xs text-ctp-subtext0">{m.bucket.decks} decks · {m.bucket.players} players · {m.bucket.events} events</p>
        </li>)}
      </ul>
      <p className="mt-3 text-sm text-ctp-subtext1">Earlier discovery: {points(f.discovery.lift)} overall; {points(f.discovery.weakestMemberLift)} weakest member difference. Complete package: {f.discovery.complete.decks} decks, {f.discovery.complete.players} players, {f.discovery.complete.events} events.</p>
      <p className="mt-2 text-sm text-ctp-subtext1">Co-occurrence candidates: {f.existingCandidateOverlap === "exact" ? "an exact card-set match" : f.existingCandidateOverlap === "subset-or-superset" ? "overlaps a subset or superset" : "no exact, subset, or superset match"}. This comparison excludes registered rules and optional-member families.</p>
    </details>
  </article>;
}

