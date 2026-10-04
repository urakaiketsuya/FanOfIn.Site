import type { ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { ProfileAppearance } from "@gatcg/shared";
import { Link } from "react-router-dom";
import { db } from "../../lib/db";
import { profileAppearanceStyle } from "../../lib/elementAppearance";
import CardArtTile from "../../components/CardArtTile";

export default function ProfileHeader({ displayName, element, portraitCardId, children }: ProfileAppearance & { displayName: string; children?: ReactNode }) {
  const card = useLiveQuery(async () => portraitCardId ? await db.cards.get(portraitCardId) : undefined, [portraitCardId]);
  const name = card?.name ?? "Card unavailable";
  return <header data-component="ProfileHeader" className="identity-surface overflow-hidden rounded-3xl" style={profileAppearanceStyle(element)}>
    {portraitCardId && <div className="relative h-48 overflow-hidden sm:h-72" aria-label="Featured card artwork">
      <div className="absolute inset-x-0 top-0">
        <CardArtTile card={card} name={name} artworkOnly />
      </div>
    </div>}
    <div className="p-5 sm:p-6">
      <h2 className="break-words text-3xl font-bold">{displayName}</h2>
      {portraitCardId && <div className="mt-1 text-sm text-ctp-subtext1">
        {card ? <Link to={`/cards/${card.slug}`} target="_blank" rel="noreferrer" className="inline-flex min-h-control items-center gap-1 rounded underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue"><span>Featured card · {name}</span><span className="sr-only"> (opens in a new tab)</span></Link> : <p className="py-3">{name}</p>}
      </div>}
      {children}
    </div>
  </header>;
}
