import { useMemo } from "react";
import type { Card } from "@gatcg/shared";
import type { BroadcastTimelineBeat, BroadcastTimelineGame, BroadcastTimelineMatch, BroadcastTimelineTag } from "@gatcg/shared";
import Panel from "../../components/ui/Panel";
import Section from "../../components/ui/Section";
import BroadcastDataNotice from "../../components/BroadcastDataNotice";
import CardMentions from "./CardMentions";
import { useCardsByMentions } from "./data";

const ACTOR_COLOR: Record<"p1" | "p2" | "both", string> = {
  p1: "border-ctp-blue bg-ctp-blue",
  p2: "border-ctp-mauve bg-ctp-mauve",
  both: "border-ctp-subtext0 bg-ctp-subtext0",
};

const ACTOR_TEXT: Record<"p1" | "p2" | "both", string> = {
  p1: "text-ctp-blue",
  p2: "text-ctp-mauve",
  both: "text-ctp-subtext0",
};

const TAG_LABEL: Record<BroadcastTimelineTag, string> = {
  combo: "Combo",
  swing: "Swing",
  sideboard: "Sideboard",
  ruling: "Ruling",
  lethal: "Lethal",
  stabilize: "Stabilize",
};

const TAG_CLASS: Record<BroadcastTimelineTag, string> = {
  combo: "border-ctp-mauve/40 bg-ctp-mauve/10 text-ctp-mauve",
  swing: "border-ctp-yellow/40 bg-ctp-yellow/10 text-ctp-yellow",
  sideboard: "border-ctp-teal/40 bg-ctp-teal/10 text-ctp-teal",
  ruling: "border-ctp-red/40 bg-ctp-red/10 text-ctp-red",
  lethal: "border-ctp-red/40 bg-ctp-red/10 text-ctp-red",
  stabilize: "border-ctp-green/40 bg-ctp-green/10 text-ctp-green",
};

function BeatRow({ beat, playerName, cardsByName }: { beat: BroadcastTimelineBeat; playerName: (a: "p1" | "p2" | "both") => string; cardsByName: Map<string, Card> }) {
  return (
    <li className="relative pb-5 pl-8 last:pb-0">
      <span className="absolute left-0 top-0 bottom-0 w-px bg-ctp-surface1" aria-hidden="true" />
      <span className={`absolute left-0 top-1 h-3 w-3 -translate-x-1/2 rounded-full border-2 bg-ctp-base ${ACTOR_COLOR[beat.actor]}`} aria-hidden="true" />
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-xs font-semibold uppercase tracking-wide ${ACTOR_TEXT[beat.actor]}`}>{playerName(beat.actor)}</span>
        {beat.tags?.map((tag) => (
          <span key={tag} className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${TAG_CLASS[tag]}`}>
            {TAG_LABEL[tag]}
          </span>
        ))}
        {beat.approxLife && (
          <span className="rounded-full border border-ctp-surface1 px-2 py-0.5 text-[10px] font-medium text-ctp-subtext1">
            {playerName(beat.approxLife.player)}: {beat.approxLife.life} life
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-ctp-text">{beat.text}</p>
      {beat.cards && beat.cards.length > 0 && <CardMentions names={beat.cards} cardsByName={cardsByName} />}
    </li>
  );
}

function GameTimeline({
  game,
  playerName,
  cardsByName,
}: {
  game: BroadcastTimelineGame;
  playerName: (a: "p1" | "p2" | "both") => string;
  cardsByName: Map<string, Card>;
}) {
  return (
    <Panel elevation={1} padding="md">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ctp-text">Game {game.gameNumber}</h3>
        <span className="text-xs font-medium text-ctp-subtext1">{game.summary}</span>
      </div>
      <ol>
        {game.beats.map((beat) => (
          <BeatRow key={beat.order} beat={beat} playerName={playerName} cardsByName={cardsByName} />
        ))}
      </ol>
    </Panel>
  );
}

export function MatchTimelineHeader({ match }: { match: BroadcastTimelineMatch }) {
  return (
    <div>
      <Panel tone="info" padding="md">
        <p className="text-xs font-semibold uppercase tracking-wide text-ctp-blue">Broadcast commentary — not tournament data</p>
        <BroadcastDataNotice className="mt-1 text-sm text-ctp-subtext1" />
      </Panel>

      <div className="mt-4">
        <h1 className="text-2xl font-bold text-ctp-blue">
          {match.event} — {match.round}
        </h1>
        <p className="mt-1 text-sm text-ctp-subtext1">
          <span className="font-medium text-ctp-blue">{match.players[0].name}</span> ({match.players[0].deck}) vs.{" "}
          <span className="font-medium text-ctp-mauve">{match.players[1].name}</span> ({match.players[1].deck})
        </p>
        <p className="mt-1 text-sm font-medium text-ctp-text">{match.result}</p>
      </div>
    </div>
  );
}

export default function MatchTimeline({ match }: { match: BroadcastTimelineMatch }) {
  const playerName = (actor: "p1" | "p2" | "both") =>
    actor === "both" ? "Both" : match.players.find((p) => p.id === actor)?.name ?? actor;

  const allCardNames = useMemo(
    () => match.games.flatMap((game) => game.beats.flatMap((beat) => beat.cards ?? [])),
    [match],
  );
  const cardsByName = useCardsByMentions(allCardNames);

  return (
    <div data-component="MatchTimeline" className="space-y-4">
      {match.games.map((game) => {
        const notes = match.sideboardNotes?.filter((n) => n.beforeGame === game.gameNumber) ?? [];
        return (
          <div key={game.gameNumber} className="space-y-3">
            {notes.length > 0 && (
              <Section heading="dense" title="Sideboard">
                <ul className="space-y-1">
                  {notes.map((note, i) => (
                    <li key={i} className="text-sm text-ctp-subtext1">
                      <span className={`font-medium ${ACTOR_TEXT[note.actor]}`}>{playerName(note.actor)}: </span>
                      {note.text}
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            <GameTimeline game={game} playerName={playerName} cardsByName={cardsByName} />
          </div>
        );
      })}

      <p className="text-xs text-ctp-subtext0">{match.sourceNote}</p>
    </div>
  );
}
