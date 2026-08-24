import type { ShoutAtYourDecksDeckSummary } from "@gatcg/shared";
import { fetchHtml } from "../lib/html.js";

// Deck pages are server-prerendered enough (Blazor Server's initial render pass) to carry this much
// via plain HTTP — no browser needed. See docs/CALCULATIONS.md and the README for how this was
// verified: the Material deck section renders completely, but Main only partially (no browser-free
// way to get the full decklist — that's what decklistFetch.ts is for, gated by filter.ts).
const TITLE_RE = /<meta property="og:title" content="([^"]*)"/;
const AUTHOR_RE = /<meta property="og:description" content="By ([^"]*)"/;
const CHAMPION_RE = /<meta property="og:image:alt" content="([a-z0-9-]+) champion portrait"/;
const MATERIAL_RE = /Material \((\d+)\)/;
const MAIN_RE = /Main \((\d+)\)/;
const SIDE_RE = /Side \((\d+)\)/;
const PRICE_RE = /TCG Player Low[\s\S]{0,200}?\$([0-9,]+\.[0-9]{2})/;

function decodeHtmlEntities(raw: string): string {
  // Deck titles can contain numeric character references (e.g. "&#x27;" for an apostrophe, or CJK
  // text as &#x6C34;...) — node's querystring.unescape only handles %-encoding, so decode manually.
  return raw
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function parseDeckSummary(id: string, url: string, html: string): ShoutAtYourDecksDeckSummary {
  const titleMatch = TITLE_RE.exec(html);
  const authorMatch = AUTHOR_RE.exec(html);
  const championMatch = CHAMPION_RE.exec(html);
  const materialMatch = MATERIAL_RE.exec(html);
  const mainMatch = MAIN_RE.exec(html);
  const sideMatch = SIDE_RE.exec(html);
  const priceMatch = PRICE_RE.exec(html);

  return {
    id,
    url,
    title: titleMatch ? decodeHtmlEntities(titleMatch[1]) : "",
    author: authorMatch ? decodeHtmlEntities(authorMatch[1]) : "",
    champion: championMatch ? championMatch[1] : null,
    priceLow: priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : null,
    materialCount: materialMatch ? Number(materialMatch[1]) : null,
    mainCount: mainMatch ? Number(mainMatch[1]) : null,
    sideCount: sideMatch ? Number(sideMatch[1]) : 0,
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchDeckSummary(id: string, url: string): Promise<ShoutAtYourDecksDeckSummary> {
  const html = await fetchHtml(url);
  return parseDeckSummary(id, url, html);
}
