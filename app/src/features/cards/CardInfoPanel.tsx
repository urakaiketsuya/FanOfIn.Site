import { cardImagePath } from "../../lib/previewCards";
import { cardLegalityStatus } from "@gatcg/shared";
import type { Card, CardQuantityBucket, CardStat } from "@gatcg/shared";
import { Link } from "react-router-dom";
import CardHoverPreview from "../../components/CardHoverPreview";
import Section from "../../components/ui/Section";

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="min-w-0 break-words border-l border-ctp-surface2 pl-4 first:border-l-0 first:pl-0"><p className="text-xs text-ctp-subtext0">{label}</p><p className="mt-1 text-xl font-semibold text-ctp-text">{value}</p></div>;
}

export default function CardInfoPanel({ card, cardStat, metaShare, communityShare, quantityBuckets, resolveReference }: { card: Card; cardStat?: CardStat; metaShare: number | null; communityShare?: number; quantityBuckets: CardQuantityBucket[]; resolveReference: (reference: { slug: string; name: string }) => Card | undefined }) {
  const references = card.references ?? [];
  const referencedBy = card.referenced_by ?? [];
  return <>
    {cardStat && <Section className="mt-4" heading="dense" title="Tournament usage">
      <div className="grid grid-cols-2 gap-4 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4 sm:grid-cols-3">
        <Metric label="Recorded lists" value={cardStat.deckCount.toLocaleString()} />
        <Metric label="Tournament inclusion" value={metaShare === null ? '—' : `${(metaShare * 100).toFixed(1)}%`} />
        <Metric label="Adjusted win rate" value={`${(cardStat.adjustedWinRate * 100).toFixed(0)}%`} />
      </div>
      <p className="mt-2 text-xs text-ctp-subtext0">{cardStat.eventCount.toLocaleString()} events</p>
    </Section>}
    {communityShare !== undefined && <Section className="mt-4" heading="dense" title="Community usage"><Metric label="Community inclusion" value={`${(communityShare * 100).toFixed(1)}%`} /></Section>}
    <CardCopyDistribution buckets={quantityBuckets} />
    <Section className="mt-4" heading="dense" title="Legality"><div className="mt-1 flex flex-wrap gap-2 text-sm">{(["STANDARD", "PANTHEON"] as const).map((format) => { const limit = card.legality?.[format]?.limit; const status = cardLegalityStatus(card, format); const effectiveLimit = limit ?? (format === "PANTHEON" ? 1 : 4); return <span key={format} className="text-ctp-subtext1">{format}: {status === "banned" ? <span className="text-ctp-red">Banned</span> : status === "unverified" ? <span className="text-ctp-yellow">Legality unverified</span> : <>Legal · Max {effectiveLimit}</>}</span>; })}</div></Section>
    {(references.length > 0 || referencedBy.length > 0) && <div className="mt-4 space-y-2">
      {references.length > 0 && <Section heading="dense" collapsible defaultOpen={false} title="References"><div className="mt-1 flex flex-wrap gap-2 text-sm">{references.map((reference) => <CardHoverPreview key={reference.slug} image={cardImagePath(resolveReference(reference))} alt={reference.name}><Link to={`/cards/${reference.slug}`} className="text-ctp-blue hover:underline">{reference.name} <span className="text-ctp-subtext0">({reference.kind.toLowerCase()})</span></Link></CardHoverPreview>)}</div></Section>}
      {referencedBy.length > 0 && <Section heading="dense" collapsible defaultOpen={false} title="Referenced by"><div className="mt-1 flex flex-wrap gap-2 text-sm">{referencedBy.map((reference) => <CardHoverPreview key={reference.slug} image={cardImagePath(resolveReference(reference))} alt={reference.name}><Link to={`/cards/${reference.slug}`} className="text-ctp-blue hover:underline">{reference.name}</Link></CardHoverPreview>)}</div></Section>}
    </div>}
  </>;
}

/** Inclusion and copies have different denominators: these buckets only contain lists playing the card. */
export function CardCopyDistribution({ buckets }: { buckets: Pick<CardQuantityBucket, 'quantity' | 'deckCount'>[] }) {
  const total = buckets.reduce((sum, bucket) => sum + bucket.deckCount, 0);
  return <Section className="mt-4" heading="dense" title="Copies played">
    {total > 0 ? <>
      <p className="mt-1 text-xs text-ctp-subtext0">{total.toLocaleString()} recorded {total === 1 ? 'list' : 'lists'} playing this card · Main + Material</p>
      <div className="mt-3 space-y-3">{[...buckets].sort((a, b) => a.quantity - b.quantity).map(bucket => {
        const share = bucket.deckCount / total * 100;
        return <div key={bucket.quantity}>
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
            <span>{bucket.quantity} {bucket.quantity === 1 ? 'copy' : 'copies'}</span>
            <span><strong className="text-ctp-text">{share.toFixed(1)}%</strong> <span className="text-xs text-ctp-subtext0">· {bucket.deckCount.toLocaleString()} {bucket.deckCount === 1 ? 'list' : 'lists'}</span></span>
          </div>
          <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-ctp-surface0"><div className="h-full rounded-full bg-ctp-teal" style={{ width: `${share}%` }} /></div>
        </div>;
      })}</div>
    </> : <p className="mt-2 text-sm text-ctp-subtext0">Copy distribution unavailable.</p>}
  </Section>;
}
