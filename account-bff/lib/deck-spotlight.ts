import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp, { type OverlayOptions } from "sharp";
import type { Card } from "../../shared/src/api-types.js";
import type { PublicDeck } from "../../shared/src/saved-deck-types.js";

import { readBytes } from "./http-response.js";

const FONT = fileURLToPath(new URL("../assets/Inter.ttf", import.meta.url));
export const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
export const cleanText = (value: string, limit: number): string => {
  const text = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return [...text].length > limit ? [...text].slice(0, limit - 1).join("") + "…" : text;
};
export function spotlightText(deck: PublicDeck) {
  return {
    title: cleanText(deck.title, 160) || "Shared deck",
    author: cleanText(deck.owner.displayName, 80) || "Community player",
    description: cleanText(deck.description, 240) || "View the published decklist on Fan of Insight.",
  };
}
export function spotlightRevision(deck: PublicDeck): string {
  return createHash("sha256").update(JSON.stringify(["spotlight-v1", spotlightText(deck), deck.championName, deck.decklist.material, deck.publishedAt])).digest("hex").slice(0, 20);
}

export function championEdition(deck: PublicDeck, cards: Card[]): string | undefined {
  const lines = new Map(deck.decklist.material.filter(line => line.quantity > 0).map(line => [line.card, line]));
  const champion = cards.filter(card => card.types.includes("CHAMPION") && lines.has(card.name))
    .sort((a, b) => (b.level ?? 0) - (a.level ?? 0) || a.name.localeCompare(b.name))[0];
  if (!champion) return undefined;
  const line = lines.get(champion.name)!;
  const selected = champion.editions.find(edition => edition.uuid === line.printings?.find(printing => printing.quantity > 0)?.editionUuid);
  return (selected ?? champion.editions[0])?.image;
}

/** Only catalog-owned image paths reach the network, never deck-authored URLs. */
export async function championArtwork(deck: PublicDeck, fetcher: typeof fetch = fetch): Promise<Buffer | undefined> {
  if (!deck.championName) return undefined;
  try {
    const params = new URLSearchParams({ name: deck.championName, type: "CHAMPION", page_size: "100" });
    const result = await fetcher(`https://api.gatcg.com/cards/search?${params}`, { redirect: "error", signal: AbortSignal.timeout(5000) });
    const catalog = JSON.parse((await readBytes(result, 3_000_000)).toString()) as { data: Card[] };
    const path = championEdition(deck, catalog.data);
    if (!path || !/^\/cards\/images\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(path)) return undefined;
    const response = await fetcher(`https://api.gatcg.com${path}`, { redirect: "error", signal: AbortSignal.timeout(5000) });
    if (!/^image\/(jpeg|png|webp)(;|$)/i.test(response.headers.get("content-type") ?? "")) return undefined;
    return await readBytes(response, 6_000_000);
  } catch { return undefined; }
}

async function textLayer(text: string, size: number, width: number, maxHeight: number, color: string, bold = false) {
  for (let fontSize = size; fontSize >= 16; fontSize -= 2) {
    const rendered = await sharp({ text: { text: `<span foreground="${color}">${escapeHtml(text)}</span>`, font: `Inter ${bold ? "Bold " : ""}${fontSize}`, fontfile: FONT, width, wrap: "word-char", rgba: true, dpi: 72 } }).png().toBuffer({ resolveWithObject: true });
    if (rendered.info.height <= maxHeight || fontSize === 16) return rendered;
  }
  throw new Error("Unable to render text");
}

/** The image carries only the approved spotlight fields: artwork, title, author and branding. */
export async function renderSpotlight(deck: PublicDeck, artwork?: Buffer): Promise<Buffer> {
  const { title, author } = spotlightText(deck);
  const overlays: OverlayOptions[] = [];
  let hasArt = false;
  if (artwork) {
    try {
      const source = sharp(artwork, { limitInputPixels: 20_000_000 });
      const { width, height } = await source.metadata();
      if (width && height) {
        // Crop the printed name/rules frame, preserving the champion illustration.
        const art = await source.extract({ left: Math.round(width * .05), top: Math.round(height * .14), width: Math.round(width * .9), height: Math.round(height * .43) })
          .resize(510, 630, { fit: "cover", position: "centre" }).png().toBuffer();
        overlays.push({ input: art, left: 0, top: 0 });
        hasArt = true;
      }
    } catch { /* Corrupt/missing art retains the branded fallback. */ }
  }
  const left = hasArt ? 570 : 72;
  const width = hasArt ? 558 : 1056;
  const brand = await textLayer("FAN OF INSIGHT", 22, width, 36, "#cba6f7", true);
  const heading = await textLayer(title, 64, width, 270, "#cdd6f4", true);
  const byline = await textLayer(`A deck by ${author}`, 28, width, 80, "#bac2de");
  const site = await textLayer("fanofin.site", 20, width, 30, "#a6adc8");
  overlays.push({ input: brand.data, left, top: 68 }, { input: heading.data, left, top: 162 }, { input: byline.data, left, top: Math.max(356, 190 + heading.info.height) }, { input: site.data, left, top: 558 });
  return sharp({ create: { width: 1200, height: 630, channels: 3, background: "#1e1e2e" } }).composite(overlays).png().toBuffer();
}

export function spotlightHtml(deck: PublicDeck, appOrigin: string, shareOrigin: string): string {
  const { title, author, description } = spotlightText(deck);
  const deckUrl = `${appOrigin}/decks/${deck.publicSlug}`;
  const shareUrl = `${shareOrigin}/share/decks/${deck.publicSlug}`;
  const imageUrl = `${shareUrl}/image.png?v=${spotlightRevision(deck)}`;
  const heading = `${title} · ${author}`;
  const alt = `${title} — a deck by ${author}. Fan of Insight.`;
  const meta = (attribute: string, name: string, value: string) => `<meta ${attribute}="${name}" content="${escapeHtml(value)}">`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(heading)} · Fan of Insight</title>
${meta("name", "robots", "noindex,follow")}
${meta("name", "description", description)}
<link rel="canonical" href="${escapeHtml(deckUrl)}">
${meta("property", "og:type", "website")}
${meta("property", "og:site_name", "Fan of Insight")}
${meta("property", "og:url", shareUrl)}
${meta("property", "og:title", heading)}
${meta("property", "og:description", description)}
${meta("property", "og:image", imageUrl)}
${meta("property", "og:image:type", "image/png")}
${meta("property", "og:image:width", "1200")}
${meta("property", "og:image:height", "630")}
${meta("property", "og:image:alt", alt)}
${meta("name", "twitter:card", "summary_large_image")}
${meta("name", "twitter:title", heading)}
${meta("name", "twitter:description", description)}
${meta("name", "twitter:image", imageUrl)}
${meta("name", "twitter:image:alt", alt)}
<style>html{color-scheme:dark light}body{margin:0;background:light-dark(#eff1f5,#11111b);color:light-dark(#4c4f69,#cdd6f4);font:16px/1.5 system-ui,sans-serif}main{max-width:720px;margin:48px auto;padding:20px}img{display:block;width:100%;height:auto;border-radius:20px;background:#1e1e2e}h1{font-size:clamp(24px,5vw,36px);line-height:1.2;overflow-wrap:anywhere;margin-bottom:8px}p{overflow-wrap:anywhere}small{color:light-dark(#6c6f85,#a6adc8)}a{display:inline-flex;min-height:48px;align-items:center;box-sizing:border-box;padding:12px 20px;border-radius:10px;background:light-dark(#1e66f5,#89b4fa);color:light-dark(#fff,#11111b);text-decoration:none;font-weight:600}a:focus-visible{outline:3px solid light-dark(#8839ef,#cba6f7);outline-offset:4px}@media(max-width:480px){main{margin:12px auto;padding:16px}}</style>
</head><body><main><img src="${escapeHtml(imageUrl)}" width="1200" height="630" alt="${escapeHtml(alt)}"><h1>${escapeHtml(title)}</h1><small>A deck by ${escapeHtml(author)}</small><p>${escapeHtml(description)}</p><a href="${escapeHtml(deckUrl)}">Open deck</a></main></body></html>`;
}
