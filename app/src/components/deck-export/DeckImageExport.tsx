import { useEffect, useState } from "react";
import type { Card } from "@gatcg/shared";
import Button from "../ui/Button";
import DialogSheet from "../ui/DialogSheet";
import { renderDeckImage, type DeckImageSection } from "../../lib/deckImage";
import { slugifyFilename } from "../../lib/ttsExport";

function imageDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string"
      ? resolve(reader.result)
      : reject(new Error("Could not prepare the PNG. Please try again."));
    reader.onerror = () => reject(new Error("Could not prepare the PNG. Please try again."));
    reader.readAsDataURL(blob);
  });
}

interface Props { title: string; ownerName?: string; sections: DeckImageSection[]; cardsByName: Map<string, Card> }

export default function DeckImageExport(props: Props) {
  const [open, setOpen] = useState(false);
  return <>
    <Button size="sm" disabled={!props.sections.some(section => section.lines.length)} onClick={() => setOpen(true)}>Export deck image</Button>
    {open && <ImageSheet {...props} onDismiss={() => setOpen(false)} />}
  </>;
}

function ImageSheet({ title, ownerName, sections, cardsByName, onDismiss }: Props & { onDismiss: () => void }) {
  // Snapshot the chosen list: background catalog refreshes must not restart an export.
  const [input] = useState(() => ({ title, ownerName, sections }));
  const [catalog, setCatalog] = useState(cardsByName);
  const [attempt, setAttempt] = useState(0);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<{ url: string; downloadUrl: string; file: File; canShare: boolean; missing: string[] } | null>(null);
  const [error, setError] = useState("");
  const [shareError, setShareError] = useState("");
  const [sharing, setSharing] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let downloadUrl: string | undefined;
    setResult(null); setError(""); setShareError(""); setProgress({ done: 0, total: 0 });
    void renderDeckImage(input.title, input.sections, catalog, controller.signal, (done, total) => setProgress({ done, total }), input.ownerName)
      .then(async value => {
        if (controller.signal.aborted) return;
        // An embedded PNG supports the browser's native image save/copy callout.
        const url = await imageDataUrl(value.blob);
        if (controller.signal.aborted) return;
        const file = new File([value.blob], `${slugifyFilename(input.title) || "decklist"}.png`, { type: "image/png" });
        const canShare = typeof navigator.share === "function" && navigator.canShare?.({ files: [file] }) === true;
        downloadUrl = URL.createObjectURL(value.blob);
        setResult({ url, downloadUrl, file, canShare, missing: value.missing });
      }).catch(reason => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not create the image. Please try again.");
      });
    return () => { controller.abort(); if (downloadUrl) URL.revokeObjectURL(downloadUrl); };
  }, [input, catalog, attempt]);
  async function shareImage() {
    if (!result || sharing) return;
    setShareError(""); setSharing(true);
    try {
      // Invoke directly from the click: native sharing requires user activation.
      await navigator.share({ files: [result.file] });
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === "AbortError")) {
        setShareError("Could not share the image. Touch and hold the preview to save it, or use Download PNG.");
      }
    } finally { setSharing(false); }
  }
  return <DialogSheet title="Export deck image" onDismiss={onDismiss} footer={<div className="flex flex-wrap items-center gap-2">
    {result?.canShare && <Button variant="primary" disabled={sharing} onClick={() => void shareImage()}>{sharing ? "Sharing…" : "Share image"}</Button>}
    {result && <a href={result.downloadUrl} download={result.file.name} className={`inline-flex min-h-control items-center justify-center rounded-md border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue ${result.canShare ? "border-ctp-surface1 text-ctp-subtext1" : "border-transparent bg-ctp-blue text-ctp-base"}`}>Download PNG</a>}
    {(error || !!result?.missing.length) && <Button onClick={() => { setCatalog(cardsByName); setAttempt(value => value + 1); }}>Retry artwork</Button>}
    {!result && !error && <p role="status" className="text-sm text-ctp-subtext1">Creating image… {progress.done}/{progress.total} cards</p>}
    {shareError && <p role="alert" className="w-full text-sm text-ctp-red">{shareError}</p>}
    {error && <p role="alert" className="w-full text-sm text-ctp-red">{error}</p>}
  </div>}>
    {result ? <>
      <p className="mb-3 text-sm text-ctp-subtext1">Touch and hold the image for save options. On desktop, right-click to save.</p>
      <img src={result.url} alt={`${input.title}: deck image with card quantities and section totals`} className="h-auto w-full rounded-lg select-auto [-webkit-touch-callout:default]" />
      {result.missing.length > 0 && <p role="status" className="mt-3 text-sm text-ctp-yellow">Artwork unavailable for {result.missing.join(", ")}. Names and quantities are included.</p>}
    </> : <p className="py-8 text-center text-sm text-ctp-subtext1">{error ? "Image preview unavailable." : "Loading card artwork…"}</p>}
  </DialogSheet>;
}
