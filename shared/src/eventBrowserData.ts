import type { OmnidexIndexData } from './omnidex-index-types.js';

export interface EventSearchData {
  generatedAt: string;
  events: Record<string, { participantNames?: string[]; championNames?: string[] }>;
}

/** Preserve the full index for existing consumers; discovery loads names only on demand. */
export function splitEventBrowserData(index: OmnidexIndexData): { summaries: OmnidexIndexData; search: EventSearchData } {
  const search: EventSearchData = { generatedAt: index.generatedAt, events: {} };
  const events = index.events.map(({ participantNames, championNames, ...summary }) => {
    search.events[summary.id] = { participantNames, championNames };
    return summary;
  });
  return { summaries: { ...index, events }, search };
}

export function joinEventBrowserData(summaries: OmnidexIndexData, search: EventSearchData): OmnidexIndexData | undefined {
  if (summaries.generatedAt !== search.generatedAt) return undefined;
  return { ...summaries, events: summaries.events.map(event => ({ ...event, ...search.events[event.id] })) };
}
