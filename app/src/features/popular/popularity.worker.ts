import { aggregatePopularDecks } from './popularityAggregation';
import { POPULARITY_ERROR, type PopularityInput, type PopularityResponse } from './popularityWorkerProtocol';

const port = self as unknown as {
  onmessage: (event: MessageEvent<PopularityInput>) => void;
  postMessage: (response: PopularityResponse) => void;
};
port.onmessage = ({ data }) => {
  try {
    port.postMessage({ decks: aggregatePopularDecks(data.cardIndex, data.sightings,
      new Map(data.catalog.map(card => [card.name, card]))) });
  } catch { port.postMessage({ error: POPULARITY_ERROR }); }
};
