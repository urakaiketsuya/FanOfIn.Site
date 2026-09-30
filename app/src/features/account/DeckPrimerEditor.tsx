import Button from "../../components/ui/Button";
import PrimerComboComposer from "./PrimerComboComposer";
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { OmnidexDecklist } from "@gatcg/shared";
import PrimerMarkdown from "./PrimerMarkdown";

export default function DeckPrimerEditor({ decklist, primerMarkdown, setPrimerMarkdown, savedMarkdown, busy, onSave }: {
  decklist: OmnidexDecklist; primerMarkdown: string; setPrimerMarkdown: Dispatch<SetStateAction<string>>;
  savedMarkdown: string; busy: boolean; onSave: () => Promise<void>;
}) {
  const [comboBuilderOpen, setComboBuilderOpen] = useState(false);
  const primerComboCardNames = useMemo(() => Array.from(new Set([...decklist.main, ...decklist.material].map(line => line.card))).sort(), [decklist]);
  function addPrimerHighlight(kind: "combo" | "package") {
    const template = kind === "combo" ? ":::combo Combo name\n- Card A\n- Card B\n\nExplain how the interaction works.\n:::" : ":::package Package name\n- 3x Card A\n- 2x Card B\n\nExplain the package's role and when to use it.\n:::";
    setPrimerMarkdown((current) => `${current}${current.trim() ? "\n\n" : ""}${template}`);
  }

  return <section id="owned-deck-panel-primer" role="tabpanel" aria-labelledby="owned-deck-tab-primer" tabIndex={0} className="mt-6 grid gap-5 lg:grid-cols-2">
      <form className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4" onSubmit={(event) => { event.preventDefault(); void onSave(); }}>
        <h2 className="font-semibold text-ctp-text">Edit primer</h2><p className="mt-1 text-xs text-ctp-subtext1">Markdown supports headings, lists, links, emphasis, quotes, code blocks, and highlighted deck concepts.</p>
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Insert primer highlight"><Button type="button" aria-expanded={comboBuilderOpen} onClick={() => setComboBuilderOpen((open) => !open)} className="rounded-md border border-ctp-mauve/60 bg-ctp-mauve/10 px-2.5 py-1.5 text-xs text-ctp-mauve">+ Combo</Button><Button type="button" onClick={() => addPrimerHighlight("package")} className="rounded-md border border-ctp-teal/60 bg-ctp-teal/10 px-2.5 py-1.5 text-xs text-ctp-teal">+ Card package</Button></div>
        <div hidden={!comboBuilderOpen}><PrimerComboComposer primerComboCardNames={primerComboCardNames} onInsert={block => { setPrimerMarkdown(current => `${current}${current.trim() ? "\n\n" : ""}${block}`); setComboBuilderOpen(false); }} onSimpleTemplate={() => addPrimerHighlight("combo")} /></div>
        <textarea aria-label="Primer Markdown" rows={24} maxLength={50000} value={primerMarkdown} onChange={(event) => setPrimerMarkdown(event.target.value)} placeholder={"# Game plan\n\nExplain opening turns, key interactions, matchups, and substitutions."} className="mt-3 w-full rounded-md border border-ctp-surface1 bg-ctp-base p-4 font-mono text-sm" />
        <div className="mt-2 flex items-center justify-between gap-3"><span className="text-xs text-ctp-subtext0">{primerMarkdown.length.toLocaleString()} / 50,000</span><Button disabled={busy || primerMarkdown === savedMarkdown} type="submit" className="rounded-md bg-ctp-blue px-3 py-2 text-sm text-ctp-base disabled:opacity-50">Save primer</Button></div>
      </form>
      <section className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4"><h2 className="font-semibold text-ctp-text">Preview</h2><div className="mt-4">{primerMarkdown.trim() ? <PrimerMarkdown markdown={primerMarkdown} decklist={decklist} /> : <p className="text-sm text-ctp-subtext1">Your primer preview will appear here.</p>}</div></section>
    </section>;
}
