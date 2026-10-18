import type { Card } from "@gatcg/shared";
import { deckImageSections, type DeckImageSection } from "./deckImage";
import { gatcgApi } from "./api/client";

export type ProxyPaper = "letter" | "a4";
export const MM = 72 / 25.4;
export const PROXY_WIDTH = 63 * MM;
export const PROXY_HEIGHT = 88 * MM;
export const PROXY_PAPERS = { letter: [612, 792], a4: [210 * MM, 297 * MM] } as const;

export function proxySections(sections: DeckImageSection[], includeSideboard: boolean) {
  return sections.filter(section => /^(main|material)( deck)?$/i.test(section.title) || (includeSideboard && /^sideboard$/i.test(section.title)));
}

export function proxyLayout(paper: ProxyPaper, count: number) {
  const [width, height] = PROXY_PAPERS[paper];
  return Array.from({ length: count }, (_, index) => ({
    page: Math.floor(index / 9),
    x: (width - 3 * PROXY_WIDTH) / 2 + index % 3 * PROXY_WIDTH,
    y: (height + 3 * PROXY_HEIGHT) / 2 - (Math.floor(index % 9 / 3) + 1) * PROXY_HEIGHT,
  }));
}

/** Decode any catalog image format, including WebP, before embedding it in the PDF. */
export async function loadProxyArtwork(image: string, signal: AbortSignal): Promise<Uint8Array> {
  const response = await fetch(gatcgApi.imageUrl(image), { signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) });
  if (!response.ok) throw new Error("Artwork unavailable");
  const bitmap = await createImageBitmap(await response.blob());
  const canvas = document.createElement("canvas");
  try {
    signal.throwIfAborted();
    // Cap at 600 dpi to bound memory while retaining print detail.
    const scale = Math.min(1, 1488 / bitmap.width, 2079 / bitmap.height);
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare artwork");
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Could not prepare artwork")), "image/jpeg", 0.97));
    signal.throwIfAborted();
    return new Uint8Array(await blob.arrayBuffer());
  } finally { bitmap.close(); canvas.width = 0; canvas.height = 0; }
}

export async function renderDeckProxyPdf(title: string, sections: DeckImageSection[], cards: Map<string, Card>, paper: ProxyPaper, signal: AbortSignal, onProgress: (done: number, total: number) => void, loadArtwork = loadProxyArtwork) {
  const tiles = deckImageSections(sections, cards).flatMap(group => group.tiles);
  const count = tiles.reduce((sum, tile) => sum + tile.quantity, 0);
  if (!count) throw new Error("Add cards before printing proxies.");
  if (!Number.isSafeInteger(count) || count > 540 || tiles.some(tile => !Number.isSafeInteger(tile.quantity) || tile.quantity < 1)) throw new Error("Export between 1 and 540 card copies at a time.");
  signal.throwIfAborted();
  const { PDFDocument, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  pdf.setTitle(title || "Deck proxies"); pdf.setCreator("Fan of Insight");
  const images = new Map<string, Awaited<ReturnType<typeof pdf.embedJpg>>>();
  const missing = new Set<string>();
  const sources = [...new Set(tiles.map(tile => tile.image))];
  onProgress(0, sources.length);
  for (const [index, source] of sources.entries()) {
    signal.throwIfAborted();
    try {
      if (!source) throw new Error("Missing artwork");
      images.set(source, await pdf.embedJpg(await loadArtwork(source, signal)));
    } catch {
      signal.throwIfAborted();
      tiles.filter(tile => tile.image === source).forEach(tile => missing.add(tile.name));
    }
    onProgress(index + 1, sources.length);
  }
  if (missing.size) throw new Error(`Artwork unavailable for ${[...missing].join(", ")}. Retry artwork before downloading.`);
  const copies = tiles.flatMap(tile => Array.from({ length: tile.quantity }, () => tile));
  const layout = proxyLayout(paper, count);
  const [width, height] = PROXY_PAPERS[paper];
  for (let pageIndex = 0; pageIndex < Math.ceil(count / 9); pageIndex++) {
    signal.throwIfAborted();
    const page = pdf.addPage([width, height]);
    copies.slice(pageIndex * 9, pageIndex * 9 + 9).forEach((tile, index) => {
      const position = layout[pageIndex * 9 + index];
      page.drawImage(images.get(tile.image!)!, { x: position.x, y: position.y, width: PROXY_WIDTH, height: PROXY_HEIGHT });
    });
    const left = (width - 3 * PROXY_WIDTH) / 2, bottom = (height - 3 * PROXY_HEIGHT) / 2;
    const line = (x1: number, y1: number, x2: number, y2: number) => page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.3, color: rgb(0.25, 0.25, 0.25) });
    // Cutting guides stay outside the card grid, including on partially filled pages.
    for (let i = 0; i <= 3; i++) {
      const x = left + i * PROXY_WIDTH, y = bottom + i * PROXY_HEIGHT;
      line(x, bottom - 1.5 * MM, x, bottom - 0.3 * MM);
      line(x, bottom + 3 * PROXY_HEIGHT + 0.3 * MM, x, bottom + 3 * PROXY_HEIGHT + 1.5 * MM);
      line(left - 1.5 * MM, y, left - 0.3 * MM, y);
      line(left + 3 * PROXY_WIDTH + 0.3 * MM, y, left + 3 * PROXY_WIDTH + 1.5 * MM, y);
    }
    line(left, 3 * MM, left + 20 * MM, 3 * MM);
    line(left, 2.5 * MM, left, 3.5 * MM); line(left + 20 * MM, 2.5 * MM, left + 20 * MM, 3.5 * MM);
    page.drawText("20 mm", { x: left + 22 * MM, y: 2.5 * MM, size: 6 });
    page.drawText(`Actual size / 100% - 63 x 88 mm - ${pageIndex + 1}/${Math.ceil(count / 9)}`, { x: left + 45 * MM, y: 2.5 * MM, size: 6 });
  }
  signal.throwIfAborted();
  const bytes = await pdf.save();
  signal.throwIfAborted();
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}
