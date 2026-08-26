import { Fragment } from "react";
import { Link } from "react-router-dom";
import type { OmnidexDecklist } from "@gatcg/shared";
import CardHoverPreview from "../../components/CardHoverPreview";
import { formatUsd } from "../../lib/format";
import { buildTtsSaveFile, downloadJsonFile, slugifyFilename } from "../../lib/ttsExport";
import { buildDeckBuilderPath, deckBuilderParamsFromDecklist } from "../../lib/deckBuilderLink";
import { useComparisonData } from "./useComparisonData";
import type { ComparedDeck } from "./types";

const PILLARS: { key: "aggro" | "consistency" | "interaction" | "resilience"; label: string }[] = [
  { key: "aggro", label: "Aggro" },
  { key: "consistency", label: "Consistency" },
  { key: "interaction", label: "Interaction" },
  { key: "resilience", label: "Resilience" },
];

/** Index of the highest value in `values`, or -1 if there's nothing to compare (fewer than 2 real values, or a tie). */
function bestIndex(values: (number | null)[]): number {
  const real = values.filter((v): v is number => v !== null);
  if (real.length < 2) return -1;
  const max = Math.max(...real);
  if (real.filter((v) => v === max).length > 1) return -1; // tied — nothing to highlight
  return values.indexOf(max);
}

/** Index of the lowest value in `values` — same tie/insufficient-data rules as `bestIndex`, for stats where less is better (price). */
function lowestIndex(values: (number | null)[]): number {
  const real = values.filter((v): v is number => v !== null);
  if (real.length < 2) return -1;
  const min = Math.min(...real);
  if (real.filter((v) => v === min).length > 1) return -1; // tied — nothing to highlight
  return values.indexOf(min);
}

export default function ComparisonGrid({
  decks,
  decklists,
}: {
  decks: ComparedDeck[];
  decklists: Map<string, OmnidexDecklist | null>;
}) {
  const { cardsByName, deckStats, sections } = useComparisonData(decks, decklists);

  function handleExportTts(deck: ComparedDeck) {
    const list = decklists.get(deck.key);
    if (!list) return;
    const stats = deckStats.find((s) => s.key === deck.key);
    const save = buildTtsSaveFile(
      [
        { label: "Main", lines: list.main },
        { label: "Material", lines: list.material },
        { label: "Sideboard", lines: list.sideboard },
      ],
      cardsByName,
    );
    downloadJsonFile(`${slugifyFilename(stats?.championName ?? deck.label)}-tts.json`, save);
  }

  function deckBuilderUrl(deck: ComparedDeck): string | null {
    const list = decklists.get(deck.key);
    if (!list) return null;
    const params = deckBuilderParamsFromDecklist(list, cardsByName);
    if (!params) return null;
    return buildDeckBuilderPath(params.championName, params.spiritFilter, params.lockedCards, params.lockedSections);
  }

  const bestPriceIndex = lowestIndex(deckStats.map((s) => (s.price > 0 ? s.price : null)));
  const bestCompositeIndex = bestIndex(deckStats.map((s) => s.rating?.composite ?? null));
  const bestWinRateIndex = bestIndex(deckStats.map((s) => s.winRate));

  return (
    <div className="max-w-full overflow-x-auto overscroll-x-contain" aria-label="Deck comparison table">
      <table className="w-max min-w-full text-sm">
        <thead>
          <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
            <th className="sticky left-0 z-10 bg-ctp-base py-1 pr-6">Card</th>
            {decks.map((d) => {
              const builderUrl = deckBuilderUrl(d);
              return (
                <th key={d.key} className="min-w-[7rem] py-1 pr-6 font-medium normal-case text-ctp-text">
                  <div className="flex items-center gap-1.5">
                    <span>{d.label}</span>
                    {decklists.get(d.key) && (
                      <button
                        type="button"
                        onClick={() => handleExportTts(d)}
                        title="Downloads a .json file — in Tabletop Simulator, use Games ▸ Save & Load ▸ Load to open it"
                        className="rounded border border-ctp-surface1 px-1 py-0.5 text-[10px] font-normal text-ctp-subtext1 hover:text-ctp-text"
                      >
                        TTS
                      </button>
                    )}
                    {builderUrl && (
                      <Link
                        to={builderUrl}
                        title="Opens this deck in the Guided Deck Builder, locked in as a starting point"
                        className="rounded border border-ctp-surface1 px-1 py-0.5 text-[10px] font-normal text-ctp-subtext1 hover:text-ctp-text"
                      >
                        Deck Builder
                      </Link>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-ctp-surface0">
          <tr>
            <td className="sticky left-0 z-10 bg-ctp-base py-1.5 pr-6 text-xs font-semibold uppercase text-ctp-subtext0">
              Win rate
            </td>
            {deckStats.map((s, i) => (
              <td key={s.key} className={`py-1.5 pr-6 ${i === bestWinRateIndex ? "text-ctp-green" : "text-ctp-subtext1"}`}>
                {s.winRate !== null ? `${(s.winRate * 100).toFixed(0)}%` : "—"}
              </td>
            ))}
          </tr>

          <tr>
            <td className="sticky left-0 z-10 bg-ctp-base py-1.5 pr-6 text-xs font-semibold uppercase text-ctp-subtext0">
              Deck price
            </td>
            {deckStats.map((s, i) => (
              <td key={s.key} className={`py-1.5 pr-6 ${i === bestPriceIndex ? "text-ctp-green" : "text-ctp-subtext1"}`}>
                {s.price > 0 ? formatUsd(s.price) : "—"}
              </td>
            ))}
          </tr>

          <tr>
            <td className="sticky left-0 z-10 bg-ctp-base py-1.5 pr-6 text-xs font-semibold uppercase text-ctp-subtext0">
              Identity
            </td>
            {deckStats.map((s) => (
              <td key={s.key} className="py-1.5 pr-6 text-ctp-subtext1">
                {s.championName ?? "—"}
                {(s.classes.length > 0 || s.elements.length > 0) && (
                  <div className="text-xs text-ctp-subtext0">
                    {[s.classes.join("/"), s.elements.join("/")].filter(Boolean).join(" · ")}
                  </div>
                )}
              </td>
            ))}
          </tr>

          <tr>
            <td className="sticky left-0 z-10 bg-ctp-base py-1.5 pr-6 text-xs font-semibold uppercase text-ctp-subtext0">
              Power rating
            </td>
            {deckStats.map((s, i) => (
              <td key={s.key} className={`py-1.5 pr-6 font-semibold ${i === bestCompositeIndex ? "text-ctp-green" : "text-ctp-text"}`}>
                {s.rating ? s.rating.composite.toFixed(1) : "—"}
              </td>
            ))}
          </tr>
          {PILLARS.map(({ key: pillar, label }) => {
            const bestPillarIndex = bestIndex(deckStats.map((s) => s.rating?.scores[pillar] ?? null));
            return (
              <tr key={pillar}>
                <td className="sticky left-0 z-10 bg-ctp-base py-1 pr-6 pl-3 text-xs text-ctp-subtext0">{label}</td>
                {deckStats.map((s, i) => (
                  <td key={s.key} className={`py-1 pr-6 text-xs ${i === bestPillarIndex ? "text-ctp-green" : "text-ctp-subtext1"}`}>
                    {s.rating ? s.rating.scores[pillar] : "—"}
                  </td>
                ))}
              </tr>
            );
          })}

          {sections.map(({ key: sectionKey, label, groups }) => {
            if (groups.length === 0) return null;
            return (
              <Fragment key={sectionKey}>
                <tr>
                  {/* section header */}
                  <td
                    colSpan={decks.length + 1}
                    className="sticky left-0 z-10 bg-ctp-mantle py-1 pr-6 text-xs font-semibold uppercase text-ctp-subtext0"
                  >
                    {label}
                  </td>
                </tr>
                {groups.map((group) => (
                  <Fragment key={group.label || "all"}>
                    {group.label && (
                      <tr>
                        <td
                          colSpan={decks.length + 1}
                          className="sticky left-0 z-10 bg-ctp-base py-1 pr-6 pl-3 text-xs text-ctp-subtext0"
                        >
                          {group.label} ({group.cards.length})
                        </td>
                      </tr>
                    )}
                    {group.cards.map(({ name, quantities, isCore, isUnique }) => {
                      const card = cardsByName.get(name);
                      return (
                        <tr key={`${sectionKey}-${name}`}>
                          <td className="sticky left-0 z-10 bg-ctp-base py-1 pr-6 pl-3">
                            <CardHoverPreview image={card?.editions[0]?.image} alt={name}>
                              {card?.slug ? (
                                <Link to={`/cards/${card.slug}`} className="text-ctp-text hover:text-ctp-blue">
                                  {name}
                                </Link>
                              ) : (
                                <span className="text-ctp-text">{name}</span>
                              )}
                            </CardHoverPreview>
                          </td>
                          {quantities.map((q, i) => (
                            <td
                              key={decks[i].key}
                              className={`py-1 pr-6 ${
                                q === 0 ? "text-ctp-surface1" : isCore ? "text-ctp-green" : isUnique ? "text-ctp-yellow" : "text-ctp-text"
                              }`}
                            >
                              {q === 0 ? "—" : `${q}x`}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      <div className="mt-2 flex flex-wrap gap-4 text-xs text-ctp-subtext0">
        <span className="text-ctp-green">■ in every deck / best value</span>
        <span className="text-ctp-yellow">■ in only one deck</span>
      </div>
    </div>
  );
}
