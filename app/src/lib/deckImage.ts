import type { Card, OmnidexDecklistCardLine } from "@gatcg/shared";
import { gatcgApi } from "./api/client";

export interface DeckImageSection { title: string; lines: OmnidexDecklistCardLine[] }
export interface DeckImageTile { name: string; quantity: number; image?: string }

/** Keep mixed printings separate and preserve every unspecified copy. */
export function deckImageSections(sections: DeckImageSection[], cards: Map<string, Card>) {
  return sections.map(section => ({
    title: section.title,
    total: section.lines.reduce((sum, line) => sum + line.quantity, 0),
    tiles: section.lines.flatMap(line => {
      const card = cards.get(line.card);
      let remaining = line.quantity;
      const tiles: DeckImageTile[] = [];
      for (const printing of line.printings ?? []) {
        const quantity = Math.min(remaining, printing.quantity);
        if (quantity <= 0) continue;
        tiles.push({ name: line.card, quantity, image: card?.editions.find(edition => edition.uuid === printing.editionUuid)?.image });
        remaining -= quantity;
      }
      if (remaining > 0) tiles.push({ name: line.card, quantity: remaining, image: card?.editions[0]?.image });
      return tiles;
    }),
  })).filter(section => section.tiles.length > 0);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.trim().split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= width) { line = candidate; continue; }
    if (line) lines.push(line);
    line = "";
    // Only split inside a word when it cannot fit by itself.
    for (const char of word) {
      if (line && ctx.measureText(line + char).width > width) { lines.push(line); line = ""; }
      line += char;
    }
  }
  if (line) lines.push(line.trim());
  return lines;
}

export async function renderDeckImage(title: string, sections: DeckImageSection[], cards: Map<string, Card>, signal: AbortSignal, onProgress: (done: number, total: number) => void) {
  const groups = deckImageSections(sections, cards);
  if (!groups.length) throw new Error("Add cards before exporting an image.");
  const canvas = document.createElement("canvas");
  canvas.width = 1800;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not create the image. Please try again.");
  const ctx = context;
  ctx.font = "bold 52px Arial";
  const titleLines = wrapText(ctx, title.trim() || "Decklist", 1680);
  const header = 116 + titleLines.length * 62;
  const tileWidth = 275, artHeight = 385, rowHeight = 466, gap = 12, margin = 45;
  const height = header + groups.reduce((sum, group) => sum + 78 + Math.ceil(group.tiles.length / 6) * rowHeight, 0) + 38;
  // Bound memory on mobile; never silently omit cards from a large draft.
  if (height > 9000) throw new Error("This deck is too large for one image. Export a smaller list.");
  canvas.height = height;
  ctx.fillStyle = "#1e1e2e"; ctx.fillRect(0, 0, canvas.width, height);
  ctx.fillStyle = "#cdd6f4"; ctx.textAlign = "center"; ctx.font = "bold 52px Arial";
  titleLines.forEach((line, index) => ctx.fillText(line, 900, 70 + index * 62));
  ctx.font = "26px Arial"; ctx.fillStyle = "#a4c8e1";
  ctx.fillText("Fan of Insight · fanofin.site", 900, header - 36);
  const jobs: { tile: DeckImageTile; x: number; y: number }[] = [];
  let top = header;
  for (const group of groups) {
    ctx.textAlign = "left"; ctx.font = "bold 32px Arial"; ctx.fillStyle = "#cdd6f4";
    ctx.fillText(`${group.title} (${group.total})`, margin, top + 38);
    top += 62;
    group.tiles.forEach((tile, index) => jobs.push({ tile, x: margin + (index % 6) * (tileWidth + gap), y: top + Math.floor(index / 6) * rowHeight }));
    top += Math.ceil(group.tiles.length / 6) * rowHeight + 16;
  }
  let done = 0;
  const missing = new Set<string>();
  onProgress(0, jobs.length);
  async function paint(job: typeof jobs[number]) {
    const { tile, x, y } = job;
    signal.throwIfAborted();
    ctx.fillStyle = "#313244"; ctx.fillRect(x, y, tileWidth, artHeight);
    let bitmap: ImageBitmap | undefined;
    try {
      if (!tile.image) throw new Error("Missing artwork");
      const response = await fetch(gatcgApi.imageUrl(tile.image), { signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) });
      if (!response.ok) throw new Error("Artwork unavailable");
      bitmap = await createImageBitmap(await response.blob());
      signal.throwIfAborted();
      ctx.drawImage(bitmap, x, y, tileWidth, artHeight);
    } catch {
      signal.throwIfAborted();
      missing.add(tile.name);
      ctx.fillStyle = "#cdd6f4"; ctx.font = "24px Arial"; ctx.textAlign = "center";
      const lines = wrapText(ctx, tile.name, tileWidth - 24);
      lines.forEach((line, index) => ctx.fillText(line, x + tileWidth / 2, y + 150 + index * 30));
    } finally { bitmap?.close(); }
    ctx.fillStyle = "#11111b"; ctx.fillRect(x, y + artHeight, tileWidth, 65);
    ctx.fillStyle = "#a4c8e1"; ctx.font = "bold 28px Arial"; ctx.textAlign = "right";
    ctx.fillText(`×${tile.quantity}`, x + tileWidth - 9, y + artHeight + 40);
    ctx.fillStyle = "#cdd6f4"; ctx.font = "20px Arial"; ctx.textAlign = "left";
    const names = wrapText(ctx, tile.name, tileWidth - 75);
    // Shrink very long names to retain all text within the caption.
    const fontSize = Math.min(20, 52 / names.length);
    ctx.font = `${fontSize}px Arial`;
    names.forEach((line, index) => ctx.fillText(line, x + 7, y + artHeight + 7 + fontSize * (index + 1)));
    onProgress(++done, jobs.length);
  }
  try {
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(6, jobs.length) }, async () => {
      while (next < jobs.length) await paint(jobs[next++]);
    }));
    signal.throwIfAborted();
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Could not create the PNG. Please try again.")), "image/png"));
    return { blob, missing: [...missing] };
  } finally { canvas.width = 0; canvas.height = 0; }
}
