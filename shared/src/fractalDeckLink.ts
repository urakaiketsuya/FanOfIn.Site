import type { OmnidexDecklist } from './omnidex-types.js';

export interface FractalDeckReference {
  eventId: number;
  playerId: number;
  topcut: boolean;
  sourceUrl: string;
  exportPath: string;
}
export interface DeckLinkPreview extends FractalDeckReference {
  decklist: OmnidexDecklist;
  origin: 'fractal' | 'omnidex';
  title: string;
}

/** Only identifiers are used for fetching; never fetch a user-supplied URL. */
export function parseFractalDeckLink(value: string): FractalDeckReference {
  const match = value.trim().match(/^https:\/\/(?:www\.)?fractalofin\.site(\/[^?#\s]*)(?:\?[^#\s]*)?(#[^\s]*)?$/);
  if (value.length > 1000 || !match) throw new Error('Use an https://fractalofin.site deck link.');
  const url = { pathname: match[1], hash: match[2] ?? '' };
  let event: string | undefined, player: string | undefined, topcut = false;
  const exported = url.pathname.match(/^\/tts\/event_(\d+)\/(\d+)(_topcut)?\.json$/);
  const combined = url.hash.match(/^#deck_(\d+)_(\d+)(_topcut)?$/);
  const single = url.hash.match(/^#deck_(\d+)(_topcut)?$/);
  const playerPage = url.pathname.match(/^\/player\/(\d+)\.html$/);
  const eventPage = url.pathname.match(/^\/[^/]+\/(\d+)\.html$/);
  if (exported) { [, event, player] = exported; topcut = !!exported[3]; }
  else if (playerPage && single) { player = playerPage[1]; event = single[1]; topcut = !!single[2]; }
  else if (eventPage && single) { event = eventPage[1]; player = single[1]; topcut = !!single[2]; }
  else if (combined && /^\/(card|deck|champion)\//.test(url.pathname)) { [, event, player] = combined; topcut = !!combined[3]; }
  if (!event || !player || ![event, player].every(id => Number.isSafeInteger(Number(id)) && Number(id) > 0)) {
    throw new Error('Open a specific deck on Fractal and copy its permalink, including #deck_.');
  }
  const eventId = Number(event), playerId = Number(player);
  return { eventId, playerId, topcut, sourceUrl: `https://fractalofin.site${url.pathname}${url.hash}`, exportPath: `/tts/event_${eventId}/${playerId}${topcut ? '_topcut' : ''}.json` };
}
