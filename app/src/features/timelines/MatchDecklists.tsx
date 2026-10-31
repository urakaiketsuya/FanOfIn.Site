import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { BroadcastTimelineMatch, BroadcastTimelinePlayer, OmnidexDecklistEntry, OmnidexPlayer } from "@gatcg/shared";
import { isApiErrorBody } from "../../lib/api/client";
import { useEventBundle } from "../events/useEventBundle";
import { useCardsByNames } from "../events/useCardsByNames";
import DecklistView from "../events/DecklistView";
import DialogSheet from "../../components/ui/DialogSheet";
import Button from "../../components/ui/Button";
import { InlineState, EmptyState } from "../../components/ui/ContentState";

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** A caster's spoken name may carry a title, alias, or parenthetical the registered username doesn't
 * ("Jet, TM32", "Asa/Asuna") – trims to the first clause before matching against the roster. */
function baseName(name: string): string {
  return name.split(/[,/(]/)[0].trim();
}

/** Best-effort match of a caster-spoken name against the event roster. Only auto-selects when exactly
 * one player is a plausible match – ambiguous or absent matches fall back to the manual search picker
 * below rather than risk attaching the wrong player's decklist. */
function autoResolvePlayer(casterName: string, players: OmnidexPlayer[]): OmnidexPlayer | undefined {
  const n = normalize(casterName);
  const nb = normalize(baseName(casterName));
  const exact = players.find((p) => normalize(p.username) === n || normalize(p.username) === nb);
  if (exact) return exact;
  if (nb.length < 3) return undefined;
  const candidates = players.filter((p) => {
    const u = normalize(p.username);
    return u.length >= 3 && (u.includes(nb) || nb.includes(u));
  });
  return candidates.length === 1 ? candidates[0] : undefined;
}

function PlayerDecklistSlot({
  caster,
  eventId,
  decklists,
  players,
  accent,
}: {
  caster: BroadcastTimelinePlayer;
  eventId: number;
  decklists: OmnidexDecklistEntry[];
  players: OmnidexPlayer[];
  accent: string;
}) {
  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const entriesWithDecklist = useMemo(() => decklists.filter((d) => playerById.has(d.player)), [decklists, playerById]);

  const autoMatch = useMemo(() => {
    if (caster.eventDecklist) return undefined;
    const eligible = entriesWithDecklist.map((d) => playerById.get(d.player)!);
    return autoResolvePlayer(caster.name, eligible);
  }, [caster.name, caster.eventDecklist, entriesWithDecklist, playerById]);

  const [explicitId, setExplicitId] = useState<number | undefined>(undefined);
  const [searchVisible, setSearchVisible] = useState(false);
  const [search, setSearch] = useState("");


  const selectedId = explicitId ?? autoMatch?.id;
  const selectedEntry = entriesWithDecklist.find((d) => d.player === selectedId);
  const selectedPlayer = selectedId !== undefined ? playerById.get(selectedId) : undefined;

  const allNames = useMemo(
    () =>
      selectedEntry
        ? [...selectedEntry.decklist.main, ...selectedEntry.decklist.material, ...selectedEntry.decklist.sideboard].map((l) => l.card)
        : [],
    [selectedEntry],
  );
  const cardsByName = useCardsByNames(allNames);

  const searchMatches = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return [];
    return entriesWithDecklist
      .map((d) => ({ entry: d, player: playerById.get(d.player)! }))
      .filter(({ player }) => player.username.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [entriesWithDecklist, playerById, search]);

  if (caster.eventDecklist) return <div className="min-w-0 flex-1">
    <p className={`text-sm font-semibold ${accent}`}>{caster.name}</p>
    <p className="mt-2 text-sm text-ctp-subtext1">{caster.eventDecklist === "unverified-stage" ? "Swiss decklist unavailable" : "Player identity unconfirmed"}</p>
    <Link to={`/events/${eventId}?tab=decklists`} className="inline-flex min-h-control items-center text-sm text-ctp-blue">Browse event decklists</Link>
  </div>;

  if (entriesWithDecklist.length === 0) return null;

  const showSearch = searchVisible;

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className={`text-sm font-semibold ${accent}`}>{caster.name}</span>
        <span className="text-xs text-ctp-subtext0">({caster.deck})</span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {selectedPlayer ? <Link to={`/events/${eventId}?tab=decklists&player=${selectedPlayer.id}`} className="inline-flex min-h-control items-center text-sm text-ctp-blue">{selectedPlayer.username} · Event decklist</Link> : <p className="text-sm text-ctp-subtext1">Player decklist not linked</p>}
        <Button variant="ghost" onClick={() => setSearchVisible(true)}>Change player</Button>
      </div>
      {showSearch && <DialogSheet title={`Decklist for ${caster.name}`} onDismiss={() => setSearchVisible(false)}>
        <label className="block text-sm">Search tournament roster
          <input type="search" value={search} onChange={e => setSearch(e.target.value)} className="mt-2 min-h-control w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 text-sm" />
        </label>
        <div className="mt-3 space-y-1">
          {searchMatches.map(({ player }) => <Button key={player.id} className="w-full text-left" onClick={() => { setExplicitId(player.id); setSearch(""); setSearchVisible(false); }}>{player.username}</Button>)}
          {search.trim() && searchMatches.length === 0 && <p className="text-sm text-ctp-subtext1">No matching players</p>}
        </div>
      </DialogSheet>}

      {selectedEntry && (
        <div className="mt-2">
          <DecklistView
            deckOwner={selectedPlayer?.username}
            decklist={selectedEntry.decklist}
            cardsByName={cardsByName}
            deckId={`${eventId}:${selectedEntry.player}`}
            showAnalysis={false}
            showDeckStats={false}
            showThumbnails
            defaultDisplayMode="visual"
          />
        </div>
      )}
    </div>
  );
}

function MatchDecklistsForEvent({ match, eventId }: { match: BroadcastTimelineMatch; eventId: number }) {
  const { bundle, error } = useEventBundle(eventId);

  if (!bundle && error) {
    return <EmptyState title="Tournament decklists unavailable" description={error} />;
  }
  if (!bundle) return <InlineState className="mt-1">Loading tournament decklists…</InlineState>;
  if (isApiErrorBody(bundle.decklists) || bundle.decklists.length === 0) {
    return <EmptyState title="No public decklists for this event" />;
  }

  const decklists = bundle.decklists;
  const players = bundle.players;

  return (
    <div>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row">
        {match.players.map((player, index) => player.stageDecklist
          ? <StageDecklist key={player.id} caster={player} />
          : <PlayerDecklistSlot key={player.id} caster={player} eventId={eventId} decklists={decklists} players={players} accent={index === 0 ? "text-ctp-blue" : "text-ctp-mauve"} />)}
      </div>
    </div>
  );
}

function StageDecklist({ caster }: { caster: BroadcastTimelinePlayer }) {
  const verified = caster.stageDecklist!;
  const names = useMemo(() => Object.values(verified.decklist).flat().map(line => line.card), [verified.decklist]);
  const cardsByName = useCardsByNames(names);
  return <div className="min-w-0 flex-1">
    <p className="text-sm font-semibold">{caster.name}</p>
    <a href={verified.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-control items-center text-sm text-ctp-blue">{verified.stage} decklist · Source</a>
    <DecklistView deckOwner={caster.name} decklist={verified.decklist} cardsByName={cardsByName}
      showAnalysis={false} showDeckStats={false} showThumbnails defaultDisplayMode="visual" />
  </div>;
}

export default function MatchDecklists({ match }: { match: BroadcastTimelineMatch }) {
  if (match.players.every(player => player.stageDecklist)) return <div className="mt-3 flex flex-col gap-4 sm:flex-row">
    {match.players.map(player => <StageDecklist key={player.id} caster={player} />)}
  </div>;
  if (match.eventId === undefined) return null;
  return <MatchDecklistsForEvent match={match} eventId={match.eventId} />;
}
