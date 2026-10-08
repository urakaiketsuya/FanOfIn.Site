import { useEffect, useState } from "react";
import type { Card } from "@gatcg/shared";
import Button from "../ui/Button";
import DialogSheet from "../ui/DialogSheet";
import { renderDeckImage, type DeckImageSection } from "../../lib/deckImage";
import { slugifyFilename } from "../../lib/ttsExport";

interface Props { title: string; sections: DeckImageSection[]; cardsByName: Map<string, Card> }

export default function DeckImageExport(props: Props) {
  const [open, setOpen] = useState(false);
  return <>
    <Button size="sm" disabled={!props.sections.some(section => section.lines.length)} onClick={() => setOpen(true)}>Export deck image</Button>
    {open && <ImageSheet {...props} onDismiss={() => setOpen(false)} />}
  </>;
}

function ImageSheet({ title, sections, cardsByName, onDismiss }: Props & { onDismiss: () => void }) {
  // Snapshot the chosen list: background catalog refreshes must not restart an export.
  const [input] = useState(() => ({ title, sections }));
  const [catalog, setCatalog] = useState(cardsByName);
  const [attempt, setAttempt] = useState(0);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<{ url: string; missing: string[] } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let url: string | undefined;
    setResult(null); setError(""); setProgress({ done: 0, total: 0 });
    void renderDeckImage(input.title, input.sections, catalog, controller.signal, (done, total) => setProgress({ done, total }))
      .then(value => {
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(value.blob);
        setResult({ url, missing: value.missing });
      }).catch(reason => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not create the image. Please try again.");
      });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [input, catalog, attempt]);
  return <DialogSheet title="Export deck image" onDismiss={onDismiss} footer={<div className="flex flex-wrap items-center gap-2">
    {result && <a href={result.url} download={`${slugifyFilename(input.title) || "decklist"}.png`} className="inline-flex min-h-control items-center justify-center rounded-md bg-ctp-blue px-4 text-sm font-medium text-ctp-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">Download PNG</a>}
    {(error || !!result?.missing.length) && <Button onClick={() => { setCatalog(cardsByName); setAttempt(value => value + 1); }}>Retry artwork</Button>}
    {!result && !error && <p role="status" className="text-sm text-ctp-subtext1">Creating image… {progress.done}/{progress.total} cards</p>}
    {error && <p role="alert" className="w-full text-sm text-ctp-red">{error}</p>}
  </div>}>
    {result ? <>
      <img src={result.url} alt={`${input.title}: deck image with card quantities and section totals`} className="h-auto w-full rounded-lg" />
      {result.missing.length > 0 && <p role="status" className="mt-3 text-sm text-ctp-yellow">Artwork unavailable for {result.missing.join(", ")}. Names and quantities are included.</p>}
    </> : <p className="py-8 text-center text-sm text-ctp-subtext1">{error ? "Image preview unavailable." : "Loading card artwork…"}</p>}
  </DialogSheet>;
}
