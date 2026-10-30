import type { OmnidexDecklistEntry } from "@gatcg/shared";

export interface PublishedEventBundle {
  event?: { format: string };
  decklists: OmnidexDecklistEntry[] | { error: string };
}

/** Share in-flight event loads without letting an older failure evict a retry. */
export function createSightingEventLoader(fetchBundle: typeof fetch = fetch) {
  const eventBundleRequests = new Map<number, Promise<PublishedEventBundle>>();

  function load(eventId: number): Promise<PublishedEventBundle> {
    let request = eventBundleRequests.get(eventId);
    if (!request) {
      request = fetchBundle(`/data/omnidex/events/${eventId}.json`)
        .then((res) => {
          if (!res.ok) throw new Error(`${res.status}`);
          return res.json() as Promise<PublishedEventBundle>;
        })
        .catch((error: unknown) => {
          if (eventBundleRequests.get(eventId) === request) eventBundleRequests.delete(eventId);
          throw error;
        });
      eventBundleRequests.set(eventId, request);
      if (eventBundleRequests.size > 12) {
        const oldest = eventBundleRequests.keys().next().value;
        if (oldest !== undefined) eventBundleRequests.delete(oldest);
      }
    }
    return request;
  }

  return { load, invalidate: (eventId: number) => { eventBundleRequests.delete(eventId); } };
}

export const sightingEventLoader = createSightingEventLoader();
