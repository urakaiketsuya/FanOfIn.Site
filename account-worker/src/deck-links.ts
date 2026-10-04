import { parseFractalDeckLink, type DeckLinkPreview, type OmnidexDecklist, type OmnidexDecklistEntry } from '@gatcg/shared';
import type { Env } from './auth';
import { assetJson } from './assets';
import { validDecklist } from './deck-input';
import { badRequest } from './errors';

export function decodeFractalDeck(value: unknown): OmnidexDecklist {
  const cards = (value as { cards?: Record<string, unknown> } | null)?.cards;
  const deck = Object.fromEntries(['main', 'material', 'sideboard'].map(section => {
    const lines = cards?.[section];
    if (!Array.isArray(lines)) throw badRequest('Fractal returned an incomplete decklist.');
    return [section, lines.map(line => ({ card: line?.name, quantity: line?.quantity }))];
  }));
  if (!validDecklist(deck) || ![...deck.main, ...deck.material].length || [...deck.main, ...deck.material, ...deck.sideboard].some(line => !line.card.trim())) throw badRequest('Fractal returned an invalid decklist.');
  return deck;
}

export async function previewDeckLink(env: Env, value: unknown, origin: unknown = 'fractal'): Promise<DeckLinkPreview> {
  if (typeof value !== 'string') throw badRequest('Enter a deck link.');
  let reference;
  try { reference = parseFractalDeckLink(value); } catch (error) { throw badRequest((error as Error).message); }
  if (origin !== 'fractal' && origin !== 'omnidex') throw badRequest('Unknown deck source.');
  if (reference.topcut && origin === 'omnidex') throw badRequest('A top cut list cannot be replaced with an Omnidex Swiss list.');
  let decklist: OmnidexDecklist;
  if (origin === 'fractal') {
    try { decklist = decodeFractalDeck(await assetJson({ ...env, ASSET_BASE_URL: 'https://fractalofin.site' }, reference.exportPath)); }
    catch { throw badRequest('The Fractal list could not be loaded. Retry, or paste its exported deck text in the deck builder.', 'deck_link_unavailable'); }
  } else {
    try {
      const bundle = await assetJson<{ decklists: OmnidexDecklistEntry[] }>(env, `/data/omnidex/events/${reference.eventId}.json`);
      const found = Array.isArray(bundle.decklists) && bundle.decklists.find(entry => entry.player === reference.playerId);
      if (!found || !validDecklist(found.decklist)) throw new Error('Missing list');
      decklist = found.decklist;
    } catch { throw badRequest('This list is not available in our Omnidex archive.'); }
  }
  return { ...reference, origin, decklist, title: `Event ${reference.eventId}, player ${reference.playerId}${reference.topcut ? ' (Top cut)' : ''}` };
}
