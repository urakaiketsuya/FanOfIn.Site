import type { Card } from '@gatcg/shared';
import Button from '../../components/ui/Button';
import { useSightingDecklist } from '../topdecks/useSightingDecklist';
import DeckBuildComparisonDisclosure from './DeckBuildComparisonDisclosure';
import DeckQuantityEvidence from './DeckQuantityEvidence';

type Props = { eventId: number; player: number; championName?: string | null };
const EMPTY_CARDS = new Map<string, Card>();

function Comparison({ eventId, player, championName }: Props) {
  const { decklist, format, error, retry } = useSightingDecklist(eventId, player, true);
  if (error) return <div role="alert" className="text-sm text-ctp-yellow">{error} <Button onClick={retry}>Retry deck</Button></div>;
  if (!decklist) return <p role="status" className="py-3 text-sm text-ctp-subtext1">Loading deck for comparison…</p>;
  return <DeckQuantityEvidence compact decklist={decklist} format={format} championName={championName} cardsByName={EMPTY_CARDS} />;
}

export default function SightingBuildComparison(props: Props) {
  if (![props.eventId, props.player].every(id => Number.isSafeInteger(id) && id > 0)) return null;
  return <DeckBuildComparisonDisclosure><Comparison key={`${props.eventId}:${props.player}`} {...props} /></DeckBuildComparisonDisclosure>;
}
