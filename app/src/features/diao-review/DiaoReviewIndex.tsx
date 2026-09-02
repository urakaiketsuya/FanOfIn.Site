import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import PageLayout from "../../components/layout/PageLayout";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import {
  useDiaoMigrationAudit,
  type DiaoMetric,
  type DiaoPillar,
  type MigrationGroup,
  type RepresentativeDeck,
} from "./data";

const METRICS: { value: DiaoMetric; label: string }[] = [
  { value: "composite", label: "Composite" },
  { value: "durability", label: "Durability" },
  { value: "interaction", label: "Interaction" },
  { value: "aggro", label: "Aggression" },
  { value: "opportunity", label: "Opportunity" },
];
const PILLARS: DiaoPillar[] = ["durability", "interaction", "aggro", "opportunity"];
const FORECAST_CHECKPOINTS = [
  { seen: 7, context: "Opening hand" },
  { seen: 10, context: "Early game" },
  { seen: 15, context: "Midgame" },
  { seen: 20, context: "Long game" },
];

function signed(value: number, digits = 2) {
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
}

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function deltaColor(value: number) {
  if (value > 0) return "text-ctp-green";
  if (value < 0) return "text-ctp-red";
  return "text-ctp-subtext0";
}

function MetricPicker({ value, onChange }: { value: DiaoMetric; onChange: (value: DiaoMetric) => void }) {
  return (
    <div className="flex flex-wrap gap-1" aria-label="Score dimension">
      {METRICS.map((metric) => (
        <button
          key={metric.value}
          type="button"
          aria-pressed={value === metric.value}
          onClick={() => onChange(metric.value)}
          className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
            value === metric.value
              ? "bg-ctp-blue text-ctp-base"
              : "bg-ctp-surface0 text-ctp-subtext1 hover:text-ctp-text"
          }`}
        >
          {metric.label}
        </button>
      ))}
    </div>
  );
}

function ChangeBar({ decreased, unchanged, increased }: { decreased: number; unchanged: number; increased: number }) {
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-ctp-surface0" aria-hidden="true">
        <span className="bg-ctp-red" style={{ width: `${decreased * 100}%` }} />
        <span className="bg-ctp-overlay0" style={{ width: `${unchanged * 100}%` }} />
        <span className="bg-ctp-green" style={{ width: `${increased * 100}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-ctp-subtext0">
        <span>{percent(decreased)} lower</span>
        <span>{percent(unchanged)} same</span>
        <span>{percent(increased)} higher</span>
      </div>
    </div>
  );
}

function GroupTable({ rows, metric }: { rows: MigrationGroup[]; metric: DiaoMetric }) {
  const visible = useMemo(
    () => [...rows].sort((a, b) => Math.abs(b.deltas[metric].mean) - Math.abs(a.deltas[metric].mean)).slice(0, 20),
    [rows, metric],
  );
  return (
    <div className="overflow-x-auto rounded-lg border border-ctp-surface0">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-ctp-mantle text-xs uppercase tracking-wide text-ctp-subtext0">
          <tr><th className="px-3 py-2">Group</th><th className="px-3 py-2 text-right">Decks</th><th className="px-3 py-2 text-right">Mean</th><th className="px-3 py-2 text-right">P10</th><th className="px-3 py-2 text-right">Median</th><th className="px-3 py-2 text-right">P90</th><th className="px-3 py-2 text-right">Changed</th></tr>
        </thead>
        <tbody className="divide-y divide-ctp-surface0">
          {visible.map((row) => {
            const delta = row.deltas[metric];
            return (
              <tr key={`${row.name}-${row.champion ?? ""}`} className="hover:bg-ctp-mantle/50">
                <td className="px-3 py-2 font-medium text-ctp-text">
                  {row.name}
                  {row.champion && <span className="ml-2 text-xs font-normal text-ctp-subtext0">{row.champion}</span>}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-ctp-subtext1">{row.decks.toLocaleString()}</td>
                <td className={`px-3 py-2 text-right font-semibold tabular-nums ${deltaColor(delta.mean)}`}>{signed(delta.mean)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-ctp-subtext1">{signed(delta.p10)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-ctp-subtext1">{signed(delta.median)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-ctp-subtext1">{signed(delta.p90)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-ctp-subtext1">{percent(1 - delta.unchangedRate)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-ctp-surface0 px-3 py-2 text-xs text-ctp-subtext0">Showing the 20 groups with the largest absolute mean change.</p>
    </div>
  );
}

function DeckExample({ deck }: { deck: RepresentativeDeck }) {
  const semantic = deck.v2SignalsOnV1Bands.composite - deck.v1.composite;
  const calibration = deck.v2.composite - deck.v2SignalsOnV1Bands.composite;
  const eventId = deck.deckId.split(":", 1)[0];
  return (
    <article className="rounded-lg border border-ctp-surface0 bg-ctp-mantle/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-ctp-text">{deck.champion}{deck.archetype ? ` · ${deck.archetype}` : ""}</h3>
          <p className="mt-0.5 text-xs text-ctp-subtext0">{deck.player} · <Link to={`/events/${eventId}`} className="text-ctp-blue hover:underline">{deck.event}</Link></p>
        </div>
        <span className={`text-lg font-bold tabular-nums ${deltaColor(deck.v2.composite - deck.v1.composite)}`}>{signed(deck.v2.composite - deck.v1.composite)}</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div><div className="text-xs text-ctp-subtext0">v1</div><div className="font-semibold tabular-nums">{deck.v1.composite.toFixed(2)}</div></div>
        <div><div className="text-xs text-ctp-subtext0">v2 signals / v1 bands</div><div className="font-semibold tabular-nums">{deck.v2SignalsOnV1Bands.composite.toFixed(2)}</div></div>
        <div><div className="text-xs text-ctp-subtext0">v2</div><div className="font-semibold tabular-nums text-ctp-blue">{deck.v2.composite.toFixed(2)}</div></div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ctp-subtext1">
        <span>Evidence <strong className={deltaColor(semantic)}>{signed(semantic)}</strong></span>
        <span>Calibration <strong className={deltaColor(calibration)}>{signed(calibration)}</strong></span>
        {Object.entries(deck.signalDelta).map(([name, value]) => {
          const delta = value ?? 0;
          return <span key={name}>{name} <strong className={deltaColor(delta)}>{signed(delta, 0)}</strong></span>;
        })}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1 border-t border-ctp-surface0 pt-3 text-center text-xs">
        {PILLARS.map((pillar) => <div key={pillar}><div className="truncate capitalize text-ctp-subtext0">{pillar}</div><div className="tabular-nums">{deck.v1.scores[pillar]} → <strong>{deck.v2.scores[pillar]}</strong></div></div>)}
      </div>
    </article>
  );
}

export default function DiaoReviewIndex() {
  useDocumentTitle("DIAO Score Review", "Review how the DIAO Score v2 migration changes decks, Champions, archetypes, and detected card signals.");
  const data = useDiaoMigrationAudit();
  const [metric, setMetric] = useState<DiaoMetric>("composite");
  const [groupView, setGroupView] = useState<"champions" | "archetypes">("champions");
  const [exampleView, setExampleView] = useState<"changes" | "signals">("changes");

  if (!data) return <div className="mx-auto max-w-5xl px-4 py-10 text-ctp-subtext1">Loading DIAO migration audit…</div>;
  const overall = data.overall[metric];
  const decomposition = data.scoreChangeDecomposition[metric];
  const examples = exampleView === "changes" ? data.representativeDecks.largestCompositeChanges : data.representativeDecks.correctedSignalDetection;

  return (
    <PageLayout width="wide">
      <PageHeader
        eyebrow={`Model migration v${data.migration.from} → v${data.migration.to}`}
        title="DIAO Score Review"
        description="Inspect whether the new evidence rules and score calibration move decks in sensible directions. This page evaluates score behavior; it does not claim that a higher score predicts wins."
      />

      <section className="rounded-xl border border-ctp-surface0 bg-ctp-mantle p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-semibold">Overall migration</h2><p className="text-xs text-ctp-subtext0">{data.sample.decks.toLocaleString()} tournament decks · generated {new Date(data.generatedAt).toLocaleDateString()}</p></div>
          <MetricPicker value={metric} onChange={setMetric} />
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-[1fr_1.3fr]">
          <div>
            <div className={`text-4xl font-bold tabular-nums ${deltaColor(overall.mean)}`}>{signed(overall.mean)}</div>
            <p className="mt-1 text-sm text-ctp-subtext1">mean {METRICS.find((item) => item.value === metric)?.label.toLowerCase()} change</p>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-sm"><div><dt className="text-xs text-ctp-subtext0">P10</dt><dd className="font-medium tabular-nums">{signed(overall.p10)}</dd></div><div><dt className="text-xs text-ctp-subtext0">Median</dt><dd className="font-medium tabular-nums">{signed(overall.median)}</dd></div><div><dt className="text-xs text-ctp-subtext0">P90</dt><dd className="font-medium tabular-nums">{signed(overall.p90)}</dd></div></dl>
          </div>
          <div>
            <ChangeBar decreased={overall.decreasedRate} unchanged={overall.unchangedRate} increased={overall.increasedRate} />
            <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
              <div><div className="text-xs text-ctp-subtext0">Evidence rules</div><div className={`font-semibold tabular-nums ${deltaColor(decomposition.meanSemanticDelta)}`}>{signed(decomposition.meanSemanticDelta)}</div></div>
              <div><div className="text-xs text-ctp-subtext0">Score bands</div><div className={`font-semibold tabular-nums ${deltaColor(decomposition.meanCalibrationDelta)}`}>{signed(decomposition.meanCalibrationDelta)}</div></div>
              <div><div className="text-xs text-ctp-subtext0">Net change</div><div className={`font-semibold tabular-nums ${deltaColor(decomposition.meanTotalDelta)}`}>{signed(decomposition.meanTotalDelta)}</div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-ctp-surface0 bg-ctp-mantle p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            <h2 className="font-semibold">Direct-damage forecast review</h2>
            <p className="mt-1 text-sm text-ctp-subtext1">
              Deck pages now pair aggression scores with an exact hypergeometric forecast of printed Champion damage among cards seen.
              This is supporting evidence for review, not an input to DIAO and not a prediction of damage that resolves in a match.
            </p>
          </div>
          <span className="rounded-full border border-ctp-blue/40 bg-ctp-blue/10 px-2.5 py-1 text-xs font-medium text-ctp-blue">
            Separate from score
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FORECAST_CHECKPOINTS.map((checkpoint) => (
            <div key={checkpoint.seen} className="rounded-lg border border-ctp-surface0 bg-ctp-base/30 px-3 py-2">
              <div className="text-lg font-semibold tabular-nums text-ctp-text">{checkpoint.seen}</div>
              <div className="text-xs text-ctp-subtext0">cards seen · {checkpoint.context}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 border-t border-ctp-surface0 pt-4 md:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">What to compare</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ctp-subtext1">
              <li>The 10th–90th percentile range should widen sensibly for conditional printed damage.</li>
              <li>Expected damage and the chances of reaching 5+ or 10+ should rise as more cards are seen.</li>
              <li>Decks with similar aggression scores may legitimately have different direct-damage forecasts.</li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Known boundaries</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ctp-subtext1">
              <li>Variable-X damage is disclosed but excluded from the arithmetic.</li>
              <li>Costs, targets, blockers, prevention, and whether conditions are enabled are not modeled.</li>
              <li>Only the main deck is sampled; material and sideboard cards do not enter the draw calculation.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">Who moves most?</h2><p className="text-sm text-ctp-subtext1">Large or one-sided shifts are the best candidates for expert review.</p></div><div className="flex gap-1"><button type="button" onClick={() => setGroupView("champions")} className={`rounded-md px-3 py-1.5 text-xs font-medium ${groupView === "champions" ? "bg-ctp-blue text-ctp-base" : "bg-ctp-surface0 text-ctp-subtext1"}`}>Champions</button><button type="button" onClick={() => setGroupView("archetypes")} className={`rounded-md px-3 py-1.5 text-xs font-medium ${groupView === "archetypes" ? "bg-ctp-blue text-ctp-base" : "bg-ctp-surface0 text-ctp-subtext1"}`}>Archetypes</button></div></div>
        <GroupTable rows={groupView === "champions" ? data.byChampion : data.byArchetype} metric={metric} />
      </section>

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">Deck spot checks</h2><p className="text-sm text-ctp-subtext1">The middle score isolates evidence-rule changes from score-band recalibration.</p></div><div className="flex gap-1"><button type="button" onClick={() => setExampleView("changes")} className={`rounded-md px-3 py-1.5 text-xs font-medium ${exampleView === "changes" ? "bg-ctp-blue text-ctp-base" : "bg-ctp-surface0 text-ctp-subtext1"}`}>Largest changes</button><button type="button" onClick={() => setExampleView("signals")} className={`rounded-md px-3 py-1.5 text-xs font-medium ${exampleView === "signals" ? "bg-ctp-blue text-ctp-base" : "bg-ctp-surface0 text-ctp-subtext1"}`}>Corrected signals</button></div></div>
        <div className="grid gap-3 lg:grid-cols-2">{examples.map((deck) => <DeckExample key={`${exampleView}-${deck.deckId}`} deck={deck} />)}</div>
      </section>

      <section className="mt-8 rounded-lg border border-ctp-surface0 p-4">
        <h2 className="font-semibold">Review checklist</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ctp-subtext1"><li>Confirm the evidence change matches what the card text actually does.</li><li>Check that heavily moved Champions and archetypes still compare plausibly to neighboring strategies.</li><li>Compare the aggression pillar with the direct-damage forecast without expecting them to match: aggression includes pressure beyond burn.</li><li>Treat broad upward movement as a calibration decision, not automatic proof that v2 is more accurate.</li></ul>
      </section>
    </PageLayout>
  );
}
