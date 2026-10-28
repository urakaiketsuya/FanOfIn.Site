import { collectedDecklist, type CollectedBuild } from '@gatcg/shared';
import DeckPreviewCard from '../../components/DeckPreviewCard';
import { BrowseComparisonChoice } from './BrowseComparison';

export default function CollectedDeckCard({ deck, names }: { deck: CollectedBuild; names: string[] }) {
  const decklist = collectedDecklist(deck.variants[0], names);
  return <BrowseComparisonChoice deck={{ key: `collected:${deck.id}`, label: `${deck.title} · ${deck.id.slice(0, 6)}${deck.variants.length > 1 ? " · Variant 1" : ""}`, format: deck.format, source: { kind: 'custom', decklist } }}>
    <DeckPreviewCard presentation="cover" model={{ id: deck.id, title: deck.title, championName: deck.championName, format: deck.format, decklist,
      source: { kind: 'community', label: 'Collected' },
      metadata: <p>{deck.variants.length === 1 ? '1 list' : `Variant 1 of ${deck.variants.length}`}</p>,
    }} view={{ to: `/decks/collected/${deck.id}` }} />
  </BrowseComparisonChoice>;
}
