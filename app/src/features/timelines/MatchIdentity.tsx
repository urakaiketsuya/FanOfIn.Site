import { Fragment } from "react";
import "./MatchIdentity.css";
import { Link } from "react-router-dom";
import type { BroadcastTimelineMatch, Card } from "@gatcg/shared";
import { championsForDeck } from "./champions";
import CardArtTile from "../../components/CardArtTile";

export default function MatchIdentity({ match, champions, linked = false, spirits = {}, animate = false, winner }: { animate?: boolean; winner?: string; spirits?: Record<string, string[]>; match: BroadcastTimelineMatch; champions?: Card[]; linked?: boolean }) {
  return <div className={`${animate ? "match-clash " : ""}grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2 sm:gap-3`}>
    {match.players.map((player, index) => {
      const cards = championsForDeck(player.deck, champions);
      const portraits = cards.length ? cards.map(card => ({ card, name: card.name.split(",")[0] })) : (spirits[player.name.toLowerCase()] ?? []).map(name => ({ card: champions?.find(card => card.name === name), name }));
      const deckLabel = player.deck.split(/\s*[(—]/)[0].trim();
      return <Fragment key={player.id}>
        {index > 0 && <span className="self-center rounded-full border border-ctp-surface2 bg-ctp-mantle px-2 py-2 text-xs font-bold text-ctp-subtext1">VS</span>}
        <div className="match-clash-player min-w-0 text-center" data-side={index === 0 ? "left" : "right"} data-winner={winner === player.id || undefined}>
          <div className="match-clash-portraits flex flex-wrap justify-center gap-2 [&_[data-component=CardArtTile]]:aspect-square [&_[data-component=CardArtTile]]:w-12 [&_[data-component=CardArtTile]]:rounded-full [&_[data-component=CardArtTile]]:ring-2 [&_[data-component=CardArtTile]]:ring-ctp-surface2 sm:[&_[data-component=CardArtTile]]:w-16 [&_img]:!w-[160%] [&_img]:!left-[-30%] [&_img]:!top-[-25%]">
            {portraits.length ? portraits.map(({ card, name }) => {
              const artwork = <><CardArtTile card={card} name={name} artworkOnly /><span className="mt-1 block text-xs font-medium text-ctp-subtext1">{name}</span></>;
              return linked && card ? <Link key={name} to={`/cards/${card.slug}`} className="flex min-h-control min-w-12 flex-col items-center rounded focus-visible:outline-2 focus-visible:outline-ctp-blue">{artwork}</Link> : <div key={name} className="flex min-w-12 flex-col items-center">{artwork}</div>;
            }) : <CardArtTile card={undefined} name="?" artworkOnly />}
          </div>
          <p className={`mt-2 break-words text-lg font-bold ${index === 0 ? "text-ctp-blue" : "text-ctp-mauve"}`}>{player.name}</p>
          <p className="break-words text-xs text-ctp-subtext1">{deckLabel}</p>
        </div>
      </Fragment>;
    })}
  </div>;
}
