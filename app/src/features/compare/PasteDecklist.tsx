import { useState } from "react";
import { parseDecklist } from "./parseDecklist";
import type { ComparedDeck } from "./types";
import type { DeckFormat } from "@gatcg/shared";

let nextCustomId = 1;

export default function PasteDecklist({ onAdd }: { onAdd: (deck: ComparedDeck) => void }) {
  const [label, setLabel] = useState("");
  const [text, setText] = useState("");
  const [lastSkipped, setLastSkipped] = useState<string[] | null>(null);
  const [format, setFormat] = useState<DeckFormat>("STANDARD");

  function handleAdd() {
    const { decklist, skippedLines } = parseDecklist(text);
    const totalCards = decklist.main.length + decklist.material.length + decklist.sideboard.length;
    if (totalCards === 0) {
      setLastSkipped(skippedLines);
      return;
    }

    onAdd({
      key: `custom-${nextCustomId++}`,
      label: label.trim() || `Custom deck ${nextCustomId - 1}`,
      source: { kind: "custom", decklist },
      format,
    });
    setLabel("");
    setText("");
    setLastSkipped(skippedLines.length > 0 ? skippedLines : null);
  }

  return (
    <div>
      <p className="text-sm text-ctp-subtext1">
        Paste a decklist — one card per line, e.g. "4x Card Name", with optional "Main" / "Material" / "Sideboard"
        section headers.
      </p>

      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Deck name (optional)"
        className="mt-2 w-full max-w-sm rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
      />

      <select value={format} onChange={(event) => setFormat(event.target.value as DeckFormat)} aria-label="Deck format" className="mt-2 rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text">
        <option value="STANDARD">Standard</option>
        <option value="PANTHEON">Pantheon</option>
      </select>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Main\n4x Dungeon Guide\n...\n\nMaterial\n1x Spirit of Water\n\nSideboard\n2x Regal Inquisition"}
        rows={8}
        className="mt-2 w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
      />

      <button
        type="button"
        onClick={handleAdd}
        disabled={text.trim().length === 0}
        className="mt-2 rounded-md border border-ctp-blue px-3 py-1.5 text-sm text-ctp-blue hover:bg-ctp-surface0 disabled:cursor-not-allowed disabled:opacity-50"
      >
        + Compare
      </button>
      {lastSkipped && lastSkipped.length > 0 && (
        <p className="mt-2 text-xs text-ctp-subtext0">
          Skipped {lastSkipped.length} unrecognized line{lastSkipped.length === 1 ? "" : "s"}: {lastSkipped.join(", ")}
        </p>
      )}
    </div>
  );
}
