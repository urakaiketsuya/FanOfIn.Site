import { Fragment } from "react";
import { Link } from "react-router-dom";
import type { OmnidexDecklist } from "@gatcg/shared";
import CardHoverPreview from "../../components/CardHoverPreview";
import { useCardsByNames } from "../events/useCardsByNames";
import { useDeckPriceByName } from "../pricing/useDeckPriceByName";
import { computeSectionPrice } from "../../lib/deckPrice";
import { formatUsd } from "../../lib/format";
import { buildTtsSaveFile, downloadJsonFile, findDeckChampionName, slugifyFilename } from "../../lib/ttsExport";
import type { ComparedDeck } from "./types";

const SECTIONS: { key: keyof OmnidexDecklist; label: string }[] = [
  { key: "main", label: "Main" },
  { key: "material", label: "Material" },
  { key: "sideboard", label: "Sideboard" },
];

export default function ComparisonGrid({
  decks,
  decklists,
}: {
  decks: ComparedDeck[];
  decklists: Map<string, OmnidexDecklist | null>;
}) {
  const priceByName = useDeckPriceByName();

  const allNames = Array.from(
    new Set(
      decks.flatMap((d) => {
        const list = decklists.get(d.key);
        if (!list) return [];
        return [...list.main, ...list.material, ...list.sideboard].map((l) => l.card);
      }),
    ),
  );
  const cardsByName = useCardsByNames(allNames);

  const resolvedCount = decks.filter((d) => decklists.get(d.key)).length;

  function handleExportTts(deck: ComparedDeck) {
    const list = decklists.get(deck.key);
    if (!list) return;
    const championName = findDeckChampionName(list.material, cardsByName);
    const save = buildTtsSaveFile(
      [
        { label: "Main", lines: list.main },
        { label: "Material", lines: list.material },
        { label: "Sideboard", lines: list.sideboard },
      ],
      cardsByName,
    );
    downloadJsonFile(`${slugifyFilename(championName ?? deck.label)}-tts.json`, save);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-max min-w-full text-sm">
        <thead>
          <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
            <th className="sticky left-0 z-10 bg-ctp-base py-1 pr-4">Card</th>
            {decks.map((d) => (
              <th key={d.key} className="min-w-[7rem] py-1 pr-4 font-medium normal-case text-ctp-text">
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
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ctp-surface0">
          <tr>
            <td className="sticky left-0 z-10 bg-ctp-base py-1.5 pr-4 text-xs font-semibold uppercase text-ctp-subtext0">
              Deck price
            </td>
            {decks.map((d) => {
              const list = decklists.get(d.key);
              if (!list) return <td key={d.key} className="py-1.5 pr-4 text-ctp-subtext0">—</td>;
              const price = computeSectionPrice([...list.main, ...list.material, ...list.sideboard], priceByName);
              return (
                <td key={d.key} className="py-1.5 pr-4 text-ctp-subtext1">
                  {price.total > 0 ? formatUsd(price.total) : "—"}
                </td>
              );
            })}
          </tr>

          {SECTIONS.map(({ key: sectionKey, label }) => {
            const namesInSection = Array.from(
              new Set(
                decks.flatMap((d) => {
                  const list = decklists.get(d.key);
                  return list ? list[sectionKey].map((l) => l.card) : [];
                }),
              ),
            );
            if (namesInSection.length === 0) return null;

            return (
              <Fragment key={sectionKey}>
                <tr>
                  {/* section header */}
                  <td
                    colSpan={decks.length + 1}
                    className="sticky left-0 z-10 bg-ctp-mantle py-1 pr-4 text-xs font-semibold uppercase text-ctp-subtext0"
                  >
                    {label}
                  </td>
                </tr>
                {namesInSection.map((name) => {
                  const quantities = decks.map((d) => {
                    const list = decklists.get(d.key);
                    const line = list?.[sectionKey].find((l) => l.card === name);
                    return line?.quantity ?? 0;
                  });
                  const presentCount = quantities.filter((q) => q > 0).length;
                  const isCore = resolvedCount > 1 && presentCount === resolvedCount;
                  const isUnique = resolvedCount > 1 && presentCount === 1;
                  const card = cardsByName.get(name);

                  return (
                    <tr key={`${sectionKey}-${name}`}>
                      <td className="sticky left-0 z-10 bg-ctp-base py-1 pr-4">
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
                          className={`py-1 pr-4 ${
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
            );
          })}
        </tbody>
      </table>

      <div className="mt-2 flex gap-4 text-xs text-ctp-subtext0">
        <span className="text-ctp-green">■ in every deck</span>
        <span className="text-ctp-yellow">■ in only one deck</span>
      </div>
    </div>
  );
}
