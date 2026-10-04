import type { ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { ProfileAppearance } from "@gatcg/shared";
import { Link } from "react-router-dom";
import { db } from "../../lib/db";
import { profileAppearanceStyle } from "../../lib/elementAppearance";
import CardArtTile from "../../components/CardArtTile";
import ElementIcon from "../../components/ElementIcon";

export default function ProfileHeader({ displayName, element, portraitCardId, children }: ProfileAppearance & { displayName: string; children?: ReactNode }) {
  const card = useLiveQuery(async () => portraitCardId ? await db.cards.get(portraitCardId) : undefined, [portraitCardId]);
  const name = card?.name ?? "Card unavailable";
  return <header className="identity-surface rounded-3xl p-5" style={profileAppearanceStyle(element)}>
    <div className="flex min-w-0 flex-wrap items-center gap-4">
      {portraitCardId && <div className="w-32 shrink-0"><CardArtTile card={card} name={name} artworkOnly />{card ? <Link to={`/cards/${card.slug}`} target="_blank" rel="noreferrer" className="flex min-h-control items-center text-sm underline">{name}<span className="sr-only"> (opens in a new tab)</span></Link> : <p className="mt-2 text-sm">{name}</p>}</div>}
      <div className="min-w-0 flex-1"><h2 className="break-words text-2xl font-bold">{displayName}</h2>{element && <p className="mt-2 flex items-center gap-2 text-sm"><ElementIcon key={element} element={element} size={24} />{element === "NORM" ? "Norm" : element[0] + element.slice(1).toLowerCase()} theme</p>}</div>
    </div>
    {children}
  </header>;
}
