import { cardLegalityStatus } from "@gatcg/shared";
import type { Card, CardQuantityBucket, CardStat } from "@gatcg/shared";
import { Link } from "react-router-dom";
import CardArtTile from "../../components/CardArtTile";
import Section from "../../components/ui/Section";

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="min-w-0 break-words rounded-xl bg-ctp-base/60 p-3"><p className="text-xs text-ctp-subtext0">{label}</p><p className="mt-1 text-xl font-semibold text-ctp-text">{value}</p></div>;
}

export default function CardInfoPanel({ card, cardStat, metaShare, communityShare, quantityBuckets, resolveReference, loading = false }: { loading?: boolean; card: Card; cardStat?: CardStat; metaShare: number | null; communityShare?: number; quantityBuckets: CardQuantityBucket[]; resolveReference: (reference: { slug: string; name: string }) => Card | undefined }) {
  const references = card.references ?? [];
  const referencedBy = card.referenced_by ?? [];
  return <>
    <Section className="mt-4" heading="dense" title="Tournament performance">
      {loading ? <p role="status" className="mt-2 text-sm text-ctp-subtext0">Loading tournament stats…</p> : cardStat ? <>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Metric label="Adjusted win rate" value={`${(cardStat.adjustedWinRate * 100).toFixed(0)}%`} />
        <Metric label="Tournament inclusion" value={metaShare === null ? '—' : `${(metaShare * 100).toFixed(1)}%`} />
        <Metric label="Recorded lists" value={cardStat.deckCount.toLocaleString()} />
      </div>
      <p className="mt-2 text-xs text-ctp-subtext0">{cardStat.eventCount.toLocaleString()} events</p>
      </> : <p className="mt-2 text-sm text-ctp-subtext0">No recorded tournament stats.</p>}
    </Section>
    {communityShare !== undefined && <Section className="mt-4" heading="dense" title="Community usage"><Metric label="Community inclusion" value={`${(communityShare * 100).toFixed(1)}%`} /></Section>}
    {!loading && <CardCopyDistribution buckets={quantityBuckets} />}
    <Section className="mt-4" heading="dense" title="Legality"><div className="mt-1 flex flex-wrap gap-2 text-sm">{(["STANDARD", "PANTHEON"] as const).map((format) => { const limit = card.legality?.[format]?.limit; const status = cardLegalityStatus(card, format); const effectiveLimit = limit ?? (format === "PANTHEON" ? 1 : 4); return <span key={format} className="text-ctp-subtext1">{format}: {status === "banned" ? <span className="text-ctp-red">Banned</span> : status === "unverified" ? <span className="text-ctp-yellow">Legality unverified</span> : <>Legal · Max {effectiveLimit}</>}</span>; })}</div></Section>
    {[{ title: "References", cards: references }, { title: "Referenced by", cards: referencedBy }].filter(group => group.cards.length > 0).map(group => <Section key={group.title} className="mt-4" heading="dense" title={group.title}>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{group.cards.map(reference => <Link key={reference.slug} to={`/cards/${reference.slug}`} className="min-w-0 rounded-lg text-sm text-ctp-blue hover:underline focus-visible:outline-2">
        <CardArtTile card={resolveReference(reference)} name={reference.name} />
        <span className="mt-1 block break-words">{reference.name}</span>
      </Link>)}</div>
    </Section>)}
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
