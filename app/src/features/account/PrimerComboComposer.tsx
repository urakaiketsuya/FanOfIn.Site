import Button from "../../components/ui/Button";
import { useState } from "react";

export default function PrimerComboComposer({ primerComboCardNames, onInsert, onSimpleTemplate }: {
  primerComboCardNames: string[]; onInsert: (block: string) => void; onSimpleTemplate: () => void;
}) {
  const [comboTitle, setComboTitle] = useState("");
  const [comboAnchor, setComboAnchor] = useState("");
  const [comboOptions, setComboOptions] = useState<string[]>([]);
  function insertConditionalCombo() {
    const options = comboOptions.filter((name) => name !== comboAnchor);
    if (!comboAnchor || options.length === 0) return;
    const title = comboTitle.trim() || `${comboAnchor} combo`;
    const block = `:::combo ${title}\n- ${comboAnchor}\n- one of: ${options.join(" | ")}\n\nExplain how the interaction works.\n:::`;
    onInsert(block);
    setComboTitle("");
    setComboAnchor("");
    setComboOptions([]);
  }

  return <div className="mt-3 rounded-lg border border-ctp-mauve/40 bg-ctp-mauve/5 p-3"><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-ctp-subtext1">Combo name<input value={comboTitle} onChange={(event) => setComboTitle(event.target.value)} placeholder="Bloom setup" className="mt-1 block min-h-12 w-full rounded-md border border-ctp-surface1 bg-ctp-base px-2.5 py-2 text-sm text-ctp-text" /></label><label className="text-xs text-ctp-subtext1">Required card<select value={comboAnchor} onChange={(event) => { setComboAnchor(event.target.value); setComboOptions((current) => current.filter((name) => name !== event.target.value)); }} className="mt-1 block min-h-12 w-full rounded-md border border-ctp-surface1 bg-ctp-base px-2.5 py-2 text-sm text-ctp-text"><option value="">Choose a card…</option>{primerComboCardNames.map((name) => <option key={name} value={name}>{name}</option>)}</select></label></div><label className="mt-3 block text-xs text-ctp-subtext1">Pair with one or more of<select multiple size={Math.min(6, Math.max(3, primerComboCardNames.length))} value={comboOptions} onChange={(event) => setComboOptions(Array.from(event.target.selectedOptions, (option) => option.value))} className="mt-1 block min-h-12 w-full rounded-md border border-ctp-surface1 bg-ctp-base px-2.5 py-2 text-sm text-ctp-text">{primerComboCardNames.filter((name) => name !== comboAnchor).map((name) => <option key={name} value={name}>{name}</option>)}</select><span className="mt-1 block text-[10px] text-ctp-subtext0">Choose from Main and Material. Use Shift or Command/Ctrl to select several alternatives.</span></label><div className="mt-3 flex gap-2"><Button type="button" disabled={!comboAnchor || comboOptions.length === 0} onClick={insertConditionalCombo} className="rounded-md bg-ctp-mauve px-3 py-1.5 text-xs font-medium text-ctp-base disabled:opacity-40">Insert combo</Button><Button type="button" onClick={() => onSimpleTemplate()} className="rounded-md border border-ctp-surface1 px-3 py-1.5 text-xs text-ctp-subtext1">Insert simple template</Button></div></div>;
}
