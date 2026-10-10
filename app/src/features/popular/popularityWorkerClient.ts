import type { PopularDeck } from "./popularityAggregation";
import { POPULARITY_ERROR, type PopularityInput, type PopularityResponse } from "./popularityWorkerProtocol";

export function popularityKey(input: PopularityInput): string {
  return JSON.stringify([input.cardIndex.generatedAt, input.sightings.generatedAt,
    input.catalog.map(({ name, classes, elements }) => [name, classes, elements])]);
}

type WorkerPort = Pick<Worker, 'onmessage' | 'onerror' | 'onmessageerror' | 'postMessage' | 'terminate'>;

/** Share in-flight work across mounts, retaining only the latest completed result. */
export function createPopularityLoader(createWorker: () => WorkerPort) {
  const pending = new Map<string, Promise<PopularDeck[]>>();
  let latestKey: string;
  let cached: { key: string; decks: PopularDeck[] } | undefined;
  return (input: PopularityInput, key = popularityKey(input)): Promise<PopularDeck[]> => {
    latestKey = key;
    if (cached?.key === key) return Promise.resolve(cached.decks);
    const existing = pending.get(key);
    if (existing) return existing;
    const work = new Promise<PopularDeck[]>((resolve, reject) => {
      let worker: WorkerPort | undefined;
      const fail = () => { worker?.terminate(); reject(new Error(POPULARITY_ERROR)); };
      try {
        worker = createWorker();
        worker.onmessage = (event: MessageEvent<PopularityResponse>) => {
          worker?.terminate();
          if (event.data.error) reject(new Error(event.data.error));
          else resolve(event.data.decks!);
        };
        worker.onerror = fail;
        worker.onmessageerror = fail;
        worker.postMessage(input);
      } catch { fail(); }
    }).then(decks => {
      if (latestKey === key) cached = { key, decks };
      return decks;
    }).finally(() => { pending.delete(key); });
    pending.set(key, work);
    return work;
  };
}

export const loadPopularDecks = createPopularityLoader(() =>
  new Worker(new URL('./popularity.worker.ts', import.meta.url), { type: 'module' }));
