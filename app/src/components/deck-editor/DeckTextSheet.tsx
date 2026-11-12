import { useState } from "react";
import { printingCardLine } from "@gatcg/shared";
import type { EditableDeck } from "../../lib/deckEditing";
import { buildEditableDeckText } from "../../lib/decklistText";
import { parseDecklist } from "../../features/compare/parseDecklist";
import DialogSheet from "../ui/DialogSheet";
import Button from "../ui/Button";

export default function DeckTextSheet({ deck, onApply, onDismiss }: { deck: EditableDeck; onApply: (deck: EditableDeck) => void; onDismiss: () => void }) {
  const [initial] = useState(() => ({ main: buildEditableDeckText(deck), maybe: deck.maybeboard.map(printingCardLine).join("\n") }));
  const [text, setText] = useState(initial.main);
  const [maybe, setMaybe] = useState(initial.maybe);
  const [error, setError] = useState("");
  function apply() {
    const parsed = parseDecklist(text);
    const board = parseDecklist(`Main\n${maybe}`);
    const skipped = [...parsed.skippedLines, ...board.skippedLines];
    if (skipped.length) { setError(`Check these lines: ${skipped.join(" · ")}`); return; }
    onApply({ ...parsed.decklist, maybeboard: board.decklist.main });
  }
  return <DialogSheet title="Edit deck text" dirty={text !== initial.main || maybe !== initial.maybe} onDismiss={onDismiss} footer={<Button variant="primary" onClick={apply}>Apply changes</Button>}>
    <label className="block text-sm">Deck list text<textarea aria-label="Deck list text" rows={14} value={text} onChange={event => setText(event.target.value)} className="mt-2 w-full rounded-lg border border-ctp-surface1 bg-ctp-base p-3 font-mono text-sm" /></label>
    <label className="mt-3 block text-sm">Maybeboard<textarea aria-label="Maybeboard text" rows={4} value={maybe} onChange={event => setMaybe(event.target.value)} className="mt-2 w-full rounded-lg border border-ctp-surface1 bg-ctp-base p-3 font-mono text-sm" /></label>
    {error && <p role="alert" className="mt-3 text-sm text-ctp-red">{error}</p>}
  </DialogSheet>;
}
