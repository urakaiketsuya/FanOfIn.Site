import { Link } from "react-router-dom";
import { useCardsByNames } from "../events/useCardsByNames";
import CardArtTile from "../../components/CardArtTile";
import type { DeckFolderAccent } from "@gatcg/shared";
import { identityStyle } from "./deckAppearance";

export default function DeckFolderPreview({ name, coverCardName, accent, count, newTab = false }: {
  name: string; coverCardName?: string | null; accent?: DeckFolderAccent; count: number; newTab?: boolean;
}) {
  const cards = useCardsByNames(coverCardName ? [coverCardName] : []);
  const card = coverCardName ? cards.get(coverCardName) : undefined;
  const art = <CardArtTile card={card} name={coverCardName ?? "Choose a cover card"} />;
  return <div className="identity-surface flex min-w-0 items-center gap-4 rounded-2xl p-4" style={identityStyle(accent)}>
    <div className="w-20 shrink-0">{coverCardName ? card ? <Link to={`/cards/${card.slug}`} target={newTab ? "_blank" : undefined} rel={newTab ? "noreferrer" : undefined} aria-label={`${coverCardName}${newTab ? ", opens in a new tab" : ""}`}>{art}</Link> : art : <div aria-hidden="true" className="flex aspect-[5/7] items-center justify-center rounded-xl border border-current/20 text-3xl text-ctp-subtext1">▱</div>}</div>
    <div className="min-w-0"><p className="text-xs text-ctp-subtext1">Private folder · {count} {count === 1 ? "deck" : "decks"}</p><p className="mt-1 break-words text-xl font-bold leading-snug">{name || "Your new folder"}</p>{coverCardName && <p className="mt-2 break-words text-xs text-ctp-subtext1">{coverCardName}</p>}</div>
  </div>;
}
