import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageLayout from "../../components/layout/PageLayout";
import Panel from "../../components/ui/Panel";
import Button from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/ContentState";
import { useBroadcastTimelines } from "./data";
import MatchIdentity from "./MatchIdentity";
import { championsForDeck, useTimelineChampions, roundLabel } from "./champions";
import TimelineStatus from "./TimelineStatus";

export default function TimelinesIndex() {
  useDocumentTitle("Match Timelines", "Players, cards and key moments from broadcast matches.");
  const data = useBroadcastTimelines();
  const champions = useTimelineChampions();
  const [params, setParams] = useSearchParams();
  const pendingParams = useRef(params);
  useEffect(() => { pendingParams.current = params; }, [params]);
  const search = params.get("q") ?? "";
  const event = params.get("event") ?? "";
  const champion = params.get("champion") ?? "";
  function update(key: string, value: string) {
    const next = new URLSearchParams(pendingParams.current);
    if (value) next.set(key, value); else next.delete(key);
    pendingParams.current = next;
    setParams(next, { replace: true });
  }
  const matches = data?.matches ?? [];
  const events = [...new Set(matches.map(match => match.event))].sort();
  const championNames = [...new Set(matches.flatMap(match => match.players.flatMap(player => championsForDeck(player.deck, champions).map(card => card.name.split(",")[0]))))].sort();
  const filtered = matches.filter(match => (!event || match.event === event) && (!champion || match.players.some(player => championsForDeck(player.deck, champions).some(card => card.name.split(",")[0] === champion))) && [match.event, match.round, ...match.players.flatMap(player => [player.name, player.deck]), ...match.games.flatMap(game => game.beats.flatMap(beat => beat.cards ?? []))].join(" ").toLowerCase().includes(search.trim().toLowerCase()));
  const control = "min-h-control w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 text-sm text-ctp-text focus-visible:outline-2 focus-visible:outline-ctp-blue";
  return <PageLayout width="fluid" data-component="TimelinesIndex">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs text-ctp-subtext0">Broadcast recaps</p><h1 className="text-3xl font-bold">Match Timelines</h1></div>
      <Link to="/timelines/combos" className="inline-flex min-h-control items-center text-sm text-ctp-blue">Notable combos →</Link>
    </div>
    <TimelineStatus loading={!data} />
    <div className="my-6 grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
      <label className="text-xs text-ctp-subtext1">Search<input className={`${control} mt-1`} value={search} onChange={e => update("q", e.target.value)} placeholder="Player or card" /></label>
      <label className="text-xs text-ctp-subtext1">Event<select className={`${control} mt-1`} value={event} onChange={e => update("event", e.target.value)}><option value="">All events</option>{events.map(name => <option key={name}>{name}</option>)}</select></label>
      <label className="text-xs text-ctp-subtext1">Champion<select className={`${control} mt-1`} value={champion} onChange={e => update("champion", e.target.value)}><option value="">All champions</option>{championNames.map(name => <option key={name}>{name}</option>)}</select></label>
    </div>
    {!data ? null : <>
      <p className="mb-3 text-sm text-ctp-subtext1" aria-live="polite">{filtered.length} matches</p>
      {!filtered.length && <EmptyState title={matches.length ? "No matches found" : "No timelines published yet"} action={matches.length ? <Button onClick={() => { pendingParams.current = new URLSearchParams(); setParams({}); }}>Clear filters</Button> : undefined} />}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map(match => <Link key={match.id} to={`/timelines/${match.id}`} className="min-w-0 rounded-xl focus-visible:outline-2 focus-visible:outline-ctp-blue">
          <Panel elevation={1} padding="md" className="h-full transition-colors hover:bg-ctp-surface1">
            <p className="mb-3 text-xs text-ctp-subtext1">{match.event} · {roundLabel(match.round)}</p>
            <MatchIdentity match={match} champions={champions} />
            <p className="mt-4 border-t border-ctp-surface1 pt-3 text-sm font-medium">{match.result}</p>
          </Panel>
        </Link>)}
      </div>
    </>}
  </PageLayout>;
}
