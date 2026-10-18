import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Card } from "@gatcg/shared";
import Button from "../ui/Button";
import DialogSheet from "../ui/DialogSheet";
import CardArtTile from "../CardArtTile";
import { deckImageSections, type DeckImageSection } from "../../lib/deckImage";
import { proxySections, renderDeckProxyPdf, type ProxyPaper } from "../../lib/deckProxyPdf";
import { slugifyFilename } from "../../lib/ttsExport";

interface Props { title: string; sections: DeckImageSection[]; cardsByName: Map<string, Card> }
export default function DeckProxyExport(props: Props) {
  const [open, setOpen] = useState(false);
  return <>
    <Button size="sm" disabled={!proxySections(props.sections, true).some(section => section.lines.some(line => line.quantity > 0))} onClick={() => setOpen(true)}>Print proxies</Button>
    {open && <ProxySheet {...props} onDismiss={() => setOpen(false)} />}
  </>;
}

function ProxySheet({ title, sections, cardsByName, onDismiss }: Props & { onDismiss: () => void }) {
  const [input] = useState(() => ({ title, sections }));
  const [catalog, setCatalog] = useState(cardsByName);
  const [paper, setPaper] = useState<ProxyPaper>("letter");
  const [sideboard, setSideboard] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const selected = proxySections(input.sections, sideboard);
  const tiles = deckImageSections(selected, catalog).flatMap(group => group.tiles);
  const count = tiles.reduce((sum, tile) => sum + tile.quantity, 0);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";
    setUrl(""); setError(""); setProgress({ done: 0, total: 0 });
    if (count) void renderDeckProxyPdf(input.title, proxySections(input.sections, sideboard), catalog, paper, controller.signal, (done, total) => setProgress({ done, total }))
      .then(blob => { if (!controller.signal.aborted) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); } })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not create the PDF. Please try again."); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [input, catalog, paper, sideboard, attempt, count]);
  function resetResult() { setUrl(""); setError(""); }
  return <DialogSheet title="Print proxies" onDismiss={onDismiss} footer={<div className="flex flex-wrap items-center gap-2">
    {url && <a href={url} download={`${slugifyFilename(input.title) || "deck"}-proxies-${paper}.pdf`} className="inline-flex min-h-control items-center justify-center rounded-md bg-ctp-blue px-4 text-sm font-medium text-ctp-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">Download PDF</a>}
    {error && <><p role="alert" className="w-full break-words text-sm text-ctp-red">{error}</p><Button onClick={() => { resetResult(); setCatalog(cardsByName); setAttempt(value => value + 1); }}>Retry artwork</Button></>}
    {!url && !error && count > 0 && <p role="status" className="text-sm text-ctp-subtext1">Creating PDF… {progress.done}/{progress.total} images</p>}
    <p className="w-full text-sm text-ctp-subtext1">Print at Actual size (100%). Turn off Fit to page.</p>
  </div>}>
    <p className="break-words font-medium">{input.title}</p>
    <p role="status" className="mb-3 text-sm text-ctp-subtext1">{count} cards · {Math.ceil(count / 9)} pages · 63 × 88 mm</p>
    {tiles.length ? <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
      {tiles.map((tile, index) => {
        const card = catalog.get(tile.name);
        const edition = card?.editions.find(value => value.image === tile.image);
        const previewCard = card && { ...card, editions: edition ? [edition] : [] };
        const content = <><CardArtTile card={previewCard} name={tile.name} cornerBadge={`×${tile.quantity}`} /><span className="mt-1 block break-words text-xs">{tile.name}</span></>;
        return card ? <Link key={`${attempt}:${index}`} to={`/cards/${card.slug}`} target="_blank" rel="noopener noreferrer" className="rounded focus-visible:outline-2 focus-visible:outline-ctp-blue" aria-label={`${tile.name}, ${tile.quantity} copies (opens in new tab)`}>{content}</Link> : <div key={`${attempt}:${index}`}>{content}</div>;
      })}
    </div> : <p className="mb-4 text-sm">No cards selected. Include the sideboard or add cards to the deck.</p>}
    <fieldset className="flex flex-wrap items-center gap-x-5"><legend className="text-sm font-medium">Paper size</legend>
      {([ ["letter", "US Letter"], ["a4", "A4"] ] as const).map(([value, label]) => <label key={value} className="flex min-h-control cursor-pointer items-center gap-2 text-sm"><input type="radio" name="proxy-paper" value={value} checked={paper === value} onChange={() => { resetResult(); setPaper(value); }} />{label}</label>)}
    </fieldset>
    {input.sections.some(section => /^sideboard$/i.test(section.title) && section.lines.length > 0) && <label className="flex min-h-control cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={sideboard} onChange={event => { resetResult(); setSideboard(event.target.checked); }} />Include sideboard</label>}
  </DialogSheet>;
}
