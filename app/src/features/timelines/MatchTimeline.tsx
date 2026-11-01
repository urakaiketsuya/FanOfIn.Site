import { useMemo } from "react";
import { usePublishedData } from "../../lib/sync/usePublishedData";
import type { BroadcastEventMaps } from "@gatcg/shared";
import type { Card } from "@gatcg/shared";
import type { BroadcastTimelineBeat, BroadcastTimelineGame, BroadcastTimelineMatch, BroadcastTimelineTag } from "@gatcg/shared";
import Panel from "../../components/ui/Panel";
import Tabs, { TabPanel } from "../../components/ui/Tabs";
import { Link } from "react-router-dom";
import { useTabParam } from "../../lib/useTabParam";
import MatchIdentity from "./MatchIdentity";
import { useTimelineChampions, roundLabel } from "./champions";

import CardMentions from "./CardMentions";
import SideboardNotes from "./SideboardNotes";
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
    <li className="relative pb-8 pl-5 sm:pl-8 last:pb-0">
      <span className="absolute left-0 top-0 bottom-0 w-px bg-ctp-surface1" aria-hidden="true" />
      <span className={`absolute left-0 top-1 h-3 w-3 -translate-x-1/2 rounded-full border-2 bg-ctp-base ${ACTOR_COLOR[beat.actor]}`} aria-hidden="true" />
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-xs font-semibold uppercase tracking-wide ${ACTOR_TEXT[beat.actor]}`}>{playerName(beat.actor)}</span>
        {beat.tags?.slice(0, 1).map((tag) => (
          <span key={tag} className={`rounded-full border px-2 py-0.5 text-xs font-medium ${TAG_CLASS[tag]}`}>
            {TAG_LABEL[tag]}
          </span>
        ))}
        {beat.approxLife && (
          <span className="rounded-full border border-ctp-surface1 px-2 py-0.5 text-xs font-medium text-ctp-subtext1">
            {playerName(beat.approxLife.player)}: ≈{beat.approxLife.life} life
          </span>
        )}
      </div>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-ctp-text">{beat.text}</p>
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
      <div className="mb-6 space-y-1">
        <h3 className="text-sm font-semibold text-ctp-text">Game {game.gameNumber}</h3>
        <p className="text-sm text-ctp-subtext1">{game.summary}</p>
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
  const champions = useTimelineChampions(true);
  const maps = usePublishedData<BroadcastEventMaps>("broadcast-events", "/data/broadcast-events.json");
  const pairing = maps?.events.find(event => event.id === match.eventId)?.stages.flatMap(stage => stage.matches).find(pair => pair.recapId === match.id);
  const spirits = Object.fromEntries((pairing?.players ?? []).map(player => [player.name.toLowerCase(), player.spirits ?? []]));
  return <header className="max-w-3xl rounded-2xl border border-ctp-surface1 bg-ctp-mantle p-4 sm:p-6">
    <Link to={`/timelines?event=${encodeURIComponent(String(match.eventId ?? match.event))}`} className="inline-flex min-h-control items-center text-sm text-ctp-blue hover:underline">{match.event}</Link>
    <h1 className="mt-1 text-2xl font-bold">{match.players[0].name} vs. {match.players[1].name}</h1>
    <p className="mt-1 text-sm text-ctp-subtext1">{roundLabel(match.round)} · {match.games.length} {match.games.length === 1 ? "game recapped" : "games recapped"}</p>
    <div className="mt-5"><MatchIdentity match={match} champions={champions} spirits={spirits} linked /></div>
    <p className="mt-5 border-t border-ctp-surface1 pt-4 text-center text-lg font-semibold">{match.result}</p>
  </header>;
}

export default function MatchTimeline({ match }: { match: BroadcastTimelineMatch }) {
  const playerName = (actor: "p1" | "p2" | "both") =>
    actor === "both" ? "Both" : match.players.find((p) => p.id === actor)?.name ?? actor;

  const allCardNames = useMemo(
    () => match.games.flatMap((game) => game.beats.flatMap((beat) => beat.cards ?? [])),
    [match],
  );
  const cardsByName = useCardsByMentions(allCardNames);

  const gameKeys = match.games.map(game => String(game.gameNumber));
  const [activeGame, setActiveGame] = useTabParam("game", gameKeys, gameKeys[0] ?? "1");
  const baseId = `games-${match.id}`;
  return <div data-component="MatchTimeline" className="grid items-start gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
    <nav aria-label="Games" className="lg:sticky lg:top-20">
      <Tabs baseId={baseId} variant="pill" wrap label="Game" active={activeGame} onChange={setActiveGame}
        tabs={match.games.map(game => ({ key: String(game.gameNumber), label: `Game ${game.gameNumber} · ${game.winner === "unknown" ? "Outcome unconfirmed" : game.winner === "draw" ? "Draw" : playerName(game.winner)}` }))} />
    </nav>
    <div className="min-w-0 max-w-3xl">
      {match.games.length === 0 && <p className="text-sm text-ctp-subtext1">No game recap available.</p>}
      {match.games.map(game => <TabPanel key={game.gameNumber} baseId={baseId} tab={String(game.gameNumber)} active={activeGame}>
        <SideboardNotes match={match} gameNumber={game.gameNumber} />
        <GameTimeline game={game} playerName={playerName} cardsByName={cardsByName} />
      </TabPanel>)}
      <footer className="mt-6 text-xs text-ctp-subtext0"><p>{match.sourceNote}</p><Link to="/methodology" className="inline-flex min-h-control items-center text-ctp-blue">About broadcast recaps</Link></footer>
    </div>
  </div>;
}
