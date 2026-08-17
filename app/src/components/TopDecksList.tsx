import { Link } from "react-router-dom";
import type { DeckSighting } from "@gatcg/shared";
import PlayerLink from "../features/players/PlayerLink";

export default function TopDecksList({ decks, playerName }: { decks: DeckSighting[]; playerName: (id: number) => string }) {
  return (
    <div className="space-y-1 text-sm">
      {decks.map((s) => (
        <div key={s.deckId} className="flex items-center justify-between text-ctp-subtext1">
          <div className="min-w-0 truncate">
            <PlayerLink id={s.player} username={playerName(s.player)} className="text-ctp-text hover:text-ctp-blue" />{" "}
            <span className="text-ctp-subtext0">at</span>{" "}
            <Link to={`/events/${s.eventId}`} className="text-ctp-blue hover:underline">
              {s.eventName}
            </Link>
          </div>
          <div className="shrink-0 pl-2">
            #{s.placement} · {s.wins}-{s.losses}-{s.ties}
          </div>
        </div>
      ))}
    </div>
  );
}
