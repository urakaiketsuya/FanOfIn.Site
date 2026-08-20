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

/**
 * One stacked, full-width panel per deck instead of a wide table — no horizontal scroll needed
 * regardless of how many decks are compared, so it works on a phone as well as desktop. Card
 * chips wrap naturally; core/unique coloring is the same signal the table view uses, just applied
 * per-deck instead of per-row.
 */
export default function ComparisonCards({
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

  return (
    <div className="space-y-4">
      {decks.map((d, i) => {
        const stats = deckStats.find((s) => s.key === d.key);
        const list = decklists.get(d.key);
        const identity = stats && [stats.classes.join("/"), stats.elements.join("/")].filter(Boolean).join(" · ");
        const builderUrl = deckBuilderUrl(d);

        return (
          <div key={d.key} className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-ctp-text">{d.label}</h3>
                {stats && (stats.championName || identity) && (
                  <p className="text-xs text-ctp-subtext0">
                    {stats.championName}
                    {identity && (stats.championName ? ` · ${identity}` : identity)}
                  </p>
                )}
                {stats?.winRate !== null && stats?.winRate !== undefined && (
                  <p className="text-xs text-ctp-subtext1">Win rate: {(stats.winRate * 100).toFixed(0)}%</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {list && (
                  <button
                    type="button"
                    onClick={() => handleExportTts(d)}
                    title="Downloads a .json file — in Tabletop Simulator, use Games ▸ Save & Load ▸ Load to open it"
                    className="rounded border border-ctp-surface1 px-1.5 py-0.5 text-[10px] text-ctp-subtext1 hover:text-ctp-text"
                  >
                    TTS
                  </button>
                )}
                {builderUrl && (
                  <Link
                    to={builderUrl}
                    title="Opens this deck in the Guided Deck Builder, locked in as a starting point"
                    className="rounded border border-ctp-surface1 px-1.5 py-0.5 text-[10px] text-ctp-subtext1 hover:text-ctp-text"
                  >
                    Deck Builder
                  </Link>
                )}
              </div>
            </div>

            {!list && <p className="mt-2 text-sm text-ctp-subtext1">No decklist available.</p>}

            {stats?.rating && (
              <>
                <div className="mt-3 flex flex-wrap items-baseline gap-3">
                  <span className="text-lg font-bold text-ctp-blue">{stats.rating.composite.toFixed(1)}</span>
                  {stats.price > 0 && <span className="text-xs text-ctp-subtext1">{formatUsd(stats.price)}</span>}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {PILLARS.map(({ key: pillar, label }) => (
                    <div key={pillar} className="flex items-center gap-1.5 text-xs">
                      <span className="w-20 shrink-0 text-ctp-subtext0">{label}</span>
                      <div className="h-1.5 flex-1 rounded-full bg-ctp-surface0">
                        <div
                          className="h-1.5 rounded-full bg-ctp-blue"
                          style={{ width: `${(stats.rating!.scores[pillar] / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {list &&
              sections.map(({ key: sectionKey, label, groups }) => {
                const deckGroups = groups
                  .map((g) => ({ ...g, cards: g.cards.filter((c) => c.quantities[i] > 0) }))
                  .filter((g) => g.cards.length > 0);
                if (deckGroups.length === 0) return null;
                const total = deckGroups.reduce((n, g) => n + g.cards.length, 0);
                return (
                  <div key={sectionKey} className="mt-3">
                    <h4 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">
                      {label} ({total})
                    </h4>
                    {deckGroups.map((group) => (
                      <div key={group.label || "all"} className="mt-1">
                        {group.label && <p className="text-[11px] text-ctp-subtext0">{group.label}</p>}
                        <ul className="mt-0.5 flex flex-wrap gap-1">
                          {group.cards.map((c) => {
                            const card = cardsByName.get(c.name);
                            const colorClass = c.isCore
                              ? "border-ctp-green text-ctp-green"
                              : c.isUnique
                                ? "border-ctp-yellow text-ctp-yellow"
                                : "border-ctp-surface1 text-ctp-text";
                            return (
                              <li key={c.name}>
                                <CardHoverPreview image={card?.editions[0]?.image} alt={c.name}>
                                  {card?.slug ? (
                                    <Link to={`/cards/${card.slug}`} className={`rounded border px-1.5 py-0.5 text-xs ${colorClass}`}>
                                      {c.quantities[i]}x {c.name}
                                    </Link>
                                  ) : (
                                    <span className={`rounded border px-1.5 py-0.5 text-xs ${colorClass}`}>
                                      {c.quantities[i]}x {c.name}
                                    </span>
                                  )}
                                </CardHoverPreview>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                );
              })}
          </div>
        );
      })}

      <div className="flex flex-wrap gap-4 text-xs text-ctp-subtext0">
        <span className="text-ctp-green">■ in every deck</span>
        <span className="text-ctp-yellow">■ in only one deck</span>
      </div>
    </div>
  );
}
