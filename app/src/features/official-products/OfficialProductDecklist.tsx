import type { Card } from '@gatcg/shared';
import DeckCardPreview from '../../components/DeckCardPreview';
import Section from '../../components/ui/Section';
import { OFFICIAL_PRODUCT_SECTION_LABELS, OFFICIAL_PRODUCT_SECTION_ORDER, type OfficialProductDeck } from './data';

export default function OfficialProductDecklist({ deck, cardsByName }: {
  deck: OfficialProductDeck;
  cardsByName: Map<string, Card>;
}) {
  return <div className="grid gap-5">{OFFICIAL_PRODUCT_SECTION_ORDER.map(section => {
    const lines = deck.cards[section];
    if (!lines.length) return null;
    const count = lines.reduce((sum, line) => sum + line.quantity, 0);
    return <Section key={section} heading="dense" title={`${OFFICIAL_PRODUCT_SECTION_LABELS[section]} (${count})`}>
      <DeckCardPreview groupByElement={section === 'main'} lines={lines} cardsByName={cardsByName} />
    </Section>;
  })}</div>;
}
