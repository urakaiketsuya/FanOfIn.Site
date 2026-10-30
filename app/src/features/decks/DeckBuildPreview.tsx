import { Link } from 'react-router-dom';
import type { Card, deckBuildComparison } from '@gatcg/shared';
import CardArtTile from '../../components/CardArtTile';
import { deckBuildPreviewRows } from './deckBuildPreviewModel';

export default function DeckBuildPreview({ comparison, cardsByName }: { comparison: ReturnType<typeof deckBuildComparison>; cardsByName: Map<string, Card> }) {
  const rows = deckBuildPreviewRows(comparison);
  return <div className="space-y-2">
    {rows.map(row => {
      const card = cardsByName.get(row.name);
      const content = <><div className="w-20 shrink-0"><CardArtTile card={card} name={row.name} artworkOnly /></div><div className="min-w-0"><p className="break-words text-sm font-medium">{row.name}</p><p className="text-xs text-ctp-subtext1">{row.section === 'main' ? 'Main' : 'Material'} · This list {row.current} · Median {row.reference!.median}</p></div></>;
      return card ? <Link key={`${row.section}:${row.name}`} className="flex min-h-control items-center gap-3 rounded focus-visible:outline-2 focus-visible:outline-ctp-blue" to={`/cards/${card.slug}`}>{content}</Link> : <div key={`${row.section}:${row.name}`} className="flex items-center gap-3">{content}</div>;
    })}
    {!rows.length && <p role="status" className="text-sm text-ctp-subtext1">All card counts match the build medians.</p>}
  </div>;
}
