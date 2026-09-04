import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { BroadcastTimelineBeat, BroadcastTimelineGame, BroadcastTimelineMatch, Card } from "@gatcg/shared";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageLayout from "../../components/layout/PageLayout";
import Panel from "../../components/ui/Panel";
import { InlineState, EmptyState } from "../../components/ui/ContentState";
import BroadcastDataNotice from "../../components/BroadcastDataNotice";
import CardMentions from "./CardMentions";
import { useBroadcastTimelines, useCardsByMentions } from "./data";

interface ComboEntry {
  match: BroadcastTimelineMatch;
  game: BroadcastTimelineGame;
  beat: BroadcastTimelineBeat;
}

const ACTOR_TEXT: Record<"p1" | "p2" | "both", string> = {
  p1: "text-ctp-blue",
  p2: "text-ctp-mauve",
  both: "text-ctp-subtext0",
};

function ComboCard({ entry, cardsByName }: { entry: ComboEntry; cardsByName: Map<string, Card> }) {
  const { match, game, beat } = entry;
  const actorPlayer = beat.actor === "both" ? undefined : match.players.find((p) => p.id === beat.actor);

  return (
    <Panel elevation={1} padding="md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to={`/timelines/${match.id}`} className="text-sm font-medium text-ctp-text hover:text-ctp-blue hover:underline">
          {match.event} — {match.round}
        </Link>
        <span className="text-xs text-ctp-subtext0">Game {game.gameNumber}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span className={`text-xs font-semibold uppercase tracking-wide ${ACTOR_TEXT[beat.actor]}`}>
          {beat.actor === "both" ? "Both players" : actorPlayer?.name ?? beat.actor}
        </span>
        {actorPlayer && <span className="text-xs text-ctp-subtext0">({actorPlayer.deck})</span>}
      </div>
      <p className="mt-1.5 text-sm text-ctp-text">{beat.text}</p>
      {beat.cards && beat.cards.length > 0 && <CardMentions names={beat.cards} cardsByName={cardsByName} />}
    </Panel>
  );
}

export default function CombosIndex() {
  useDocumentTitle("Notable Combos", "Combo lines called out by broadcast casters, reconstructed from VOD commentary.");
  const data = useBroadcastTimelines();
  const [search, setSearch] = useState("");

  const combos = useMemo<ComboEntry[]>(() => {
    if (!data) return [];
    const entries: ComboEntry[] = [];
    for (const match of data.matches) {
      for (const game of match.games) {
        for (const beat of game.beats) {
          if (beat.tags?.includes("combo")) entries.push({ match, game, beat });
        }
      }
    }
    return entries;
  }, [data]);

  const allCardNames = useMemo(() => combos.flatMap((c) => c.beat.cards ?? []), [combos]);
  const cardsByName = useCardsByMentions(allCardNames);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return combos;
    return combos.filter(
      (c) =>
        (c.beat.cards ?? []).some((name) => name.toLowerCase().includes(needle)) ||
        c.beat.text.toLowerCase().includes(needle) ||
        c.match.event.toLowerCase().includes(needle),
    );
  }, [combos, search]);

  return (
    <PageLayout>
      <Link to="/timelines" className="mb-4 inline-block text-sm text-ctp-subtext1 hover:text-ctp-blue hover:underline">
        &larr; Match Timelines
      </Link>
      <h1 className="text-2xl font-bold text-ctp-blue">Notable Combos</h1>
      <p className="mt-1 text-sm text-ctp-subtext1">
        Every beat casters called out as a combo line across the Match Timelines dataset — a discovery tool for
        interesting card interactions actually played on stream, not a ranked or comprehensive combo list.
      </p>

      <div className="mt-4 rounded-lg border border-ctp-peach bg-ctp-peach/10 px-4 py-3 text-sm text-ctp-text">
        <p className="font-semibold text-ctp-peach">Experimental — commentary-derived, not tournament data</p>
        <BroadcastDataNotice className="mt-1 text-sm text-ctp-subtext1" />
      </div>

      {!data && <InlineState className="mt-6">Loading…</InlineState>}

      {data && combos.length === 0 && <EmptyState className="mt-6" title="No combos tagged yet" />}

      {data && combos.length > 0 && (
        <>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by card, event, or description…"
            className="mt-6 w-full max-w-sm rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
          />
          <p className="mt-2 text-xs text-ctp-subtext0">
            {filtered.length} combo{filtered.length === 1 ? "" : "s"}
            {search.trim() && ` matching “${search.trim()}”`}
          </p>

          {filtered.length === 0 ? (
            <EmptyState className="mt-4" title="No combos match your search" />
          ) : (
            <div className="mt-3 space-y-3">
              {filtered.map((entry, i) => (
                <ComboCard key={`${entry.match.id}-${entry.game.gameNumber}-${entry.beat.order}-${i}`} entry={entry} cardsByName={cardsByName} />
              ))}
            </div>
          )}
        </>
      )}
    </PageLayout>
  );
}
