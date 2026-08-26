import { Link } from "react-router-dom";
import type { OmnidexDecklist } from "@gatcg/shared";
import CardHoverPreview from "../../components/CardHoverPreview";
import type { RatingPillar } from "../../lib/deckIdentity";
import { useComparisonSummary, type ComparisonCardChange, type ComparisonDeckSummary } from "./useComparisonSummary";
import type { ComparedDeck } from "./types";

const SECTION_LABEL: Record<"main" | "material" | "sideboard", string> = { main: "Main", material: "Material", sideboard: "Sideboard" };
const PILLAR_LABEL: Record<RatingPillar, string> = {
  aggro: "Aggro",
  consistency: "Consistency",
  interaction: "Interaction",
  resilience: "Resilience",
};

function changeSign(change: ComparisonCardChange): "positive" | "negative" | "neutral" {
  if (change.kind === "added") return "positive";
  if (change.kind === "removed") return "negative";
  if (change.kind === "moved") return "neutral";
  return change.targetQty - change.baselineQty > 0 ? "positive" : change.targetQty - change.baselineQty < 0 ? "negative" : "neutral";
}

function changeLabel(change: ComparisonCardChange): string {
  const delta = change.targetQty - change.baselineQty;
  const signedDelta = `${delta >= 0 ? "+" : ""}${delta}`;
  switch (change.kind) {
    case "added":
      return `+${change.targetQty}x ${change.name} — new, ${SECTION_LABEL[change.targetSection!]}`;
    case "removed":
      return `-${change.baselineQty}x ${change.name} — cut from ${SECTION_LABEL[change.baselineSection!]}`;
    case "quantity":
      // baselineSection === targetSection for this kind (same-section quantity change) — a card
      // can carry an independent one of these per section (e.g. Main and Sideboard both changing),
      // so the section is always named rather than assumed to be the card's only placement.
      return `${signedDelta} ${change.name} (${SECTION_LABEL[change.baselineSection!]})`;
    case "moved":
      return `Moved ${change.name}: ${SECTION_LABEL[change.baselineSection!]} → ${SECTION_LABEL[change.targetSection!]}`;
    case "movedQuantity":
      return `Moved ${change.name}: ${SECTION_LABEL[change.baselineSection!]} → ${SECTION_LABEL[change.targetSection!]} (${signedDelta})`;
  }
}

/** One compact, plain-English sentence summarizing the biggest differences from the baseline — the
 * "answer" a viewer would otherwise have to reconstruct themselves from dozens of table rows. */
function buildHeadline(summary: ComparisonDeckSummary): string {
  const clauses: string[] = [];

  if (summary.priceDelta !== null && Math.abs(summary.priceDelta) >= 1) {
    clauses.push(`costs $${Math.abs(summary.priceDelta).toFixed(2)} ${summary.priceDelta > 0 ? "more" : "less"}`);
  }
  if (summary.winRateDelta !== null && Math.abs(summary.winRateDelta) >= 0.005) {
    const pp = Math.round(Math.abs(summary.winRateDelta) * 100);
    clauses.push(`wins ${pp}pp ${summary.winRateDelta > 0 ? "more" : "less"} often`);
  }
  if (summary.pillarDeltas) {
    const entries = Object.entries(summary.pillarDeltas) as [RatingPillar, number][];
    const biggest = entries.reduce((a, b) => (Math.abs(b[1]) > Math.abs(a[1]) ? b : a));
    if (Math.abs(biggest[1]) >= 2) clauses.push(`${biggest[1] > 0 ? "+" : ""}${biggest[1]} ${PILLAR_LABEL[biggest[0]]}`);
  }
  if (summary.championChanged) clauses.push("plays a different Champion print");
  else if (summary.spiritChanged) clauses.push("runs a different Spirit");
  if (summary.changes.length > 0) clauses.push(`${summary.changes.length} card change${summary.changes.length === 1 ? "" : "s"}`);

  if (clauses.length === 0) return "Identical to the baseline.";
  const sentence =
    clauses.length === 1 ? clauses[0] : `${clauses.slice(0, -1).join(", ")}, and ${clauses[clauses.length - 1]}`;
  return `${summary.label} ${sentence}.`;
}

/**
 * Compare's centerpiece view: pick one compared deck as the baseline, then describe every other
 * deck purely in terms of what differs from it — a plain-English headline plus a changed-cards-only
 * list, rather than the full side-by-side matrix (still available on the Table/Cards tabs).
 */
export default function ComparisonSummary({
  decks,
  decklists,
  baselineKey,
  onBaselineChange,
}: {
  decks: ComparedDeck[];
  decklists: Map<string, OmnidexDecklist | null>;
  baselineKey: string | null;
  onBaselineChange: (key: string) => void;
}) {
  const { baselineIndex, summaries, cardsByName } = useComparisonSummary(decks, decklists, baselineKey);

  if (decks.length < 2) {
    return <p className="text-sm text-ctp-subtext1">Add at least one more deck to see a baseline comparison.</p>;
  }
  if (baselineIndex === -1) {
    return <p className="text-sm text-ctp-subtext1">Pick a baseline deck below to compare everything else against it.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="mr-2 text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Baseline</span>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {decks.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => onBaselineChange(d.key)}
              className={`rounded-full border px-2.5 py-1 text-xs ${
                d.key === baselineKey
                  ? "border-ctp-blue bg-ctp-surface0 text-ctp-blue"
                  : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {summaries.map((summary, i) => {
        if (i === baselineIndex) return null;
        return (
          <div key={summary.key} className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4">
            <h3 className="font-semibold text-ctp-text">{summary.label}</h3>

            {summary.loading && <p className="mt-1 text-sm text-ctp-subtext1">Loading…</p>}
            {!summary.loading && summary.unavailable && (
              <p className="mt-1 text-sm text-ctp-subtext1">No decklist available for this deck or the baseline.</p>
            )}

            {!summary.loading && !summary.unavailable && (
              <>
                <p className="mt-1 text-sm text-ctp-subtext1">{buildHeadline(summary)}</p>

                {(summary.championChanged || summary.spiritChanged) && (
                  <p className="mt-2 text-xs text-ctp-subtext0">
                    {summary.championChanged && (
                      <>
                        Identity: {summary.baselineChampion ?? "—"} → {summary.targetChampion ?? "—"}
                      </>
                    )}
                    {summary.championChanged && summary.spiritChanged && <br />}
                    {summary.spiritChanged && (
                      <>
                        Spirit: {summary.baselineSpirit ?? "none"} → {summary.targetSpirit ?? "none"}
                      </>
                    )}
                  </p>
                )}

                {summary.changes.length > 0 ? (
                  <ul className="mt-3 space-y-1">
                    {summary.changes.map((change) => {
                      const card = cardsByName.get(change.name);
                      const sign = changeSign(change);
                      return (
                        <li
                          key={`${change.name}-${change.baselineSection ?? ""}-${change.targetSection ?? ""}`}
                          className="flex items-center gap-1.5 text-sm"
                        >
                          <span
                            className={
                              sign === "positive" ? "text-ctp-green" : sign === "negative" ? "text-ctp-red" : "text-ctp-subtext1"
                            }
                          >
                            {card ? (
                              <CardHoverPreview image={card.editions[0]?.image} alt={change.name}>
                                <Link to={`/cards/${card.slug}`} className="hover:underline">
                                  {changeLabel(change)}
                                </Link>
                              </CardHoverPreview>
                            ) : (
                              changeLabel(change)
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-ctp-subtext1">No card differences from the baseline.</p>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
