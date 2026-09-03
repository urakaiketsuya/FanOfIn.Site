import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { BroadcastTimelineMatch, BroadcastTimelinePlayer, OmnidexDecklistEntry, OmnidexPlayer } from "@gatcg/shared";
import { isApiErrorBody } from "../../lib/api/client";
import { useEventBundle } from "../events/useEventBundle";
import { useCardsByNames } from "../events/useCardsByNames";
import DecklistView from "../events/DecklistView";
import { InlineState, EmptyState } from "../../components/ui/ContentState";

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** A caster's spoken name may carry a title, alias, or parenthetical the registered username doesn't
 * ("Jet, TM32", "Asa/Asuna") — trims to the first clause before matching against the roster. */
function baseName(name: string): string {
  return name.split(/[,/(]/)[0].trim();
}

/** Best-effort match of a caster-spoken name against the event roster. Only auto-selects when exactly
 * one player is a plausible match — ambiguous or absent matches fall back to the manual search picker
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
    const eligible = entriesWithDecklist.map((d) => playerById.get(d.player)!);
    return autoResolvePlayer(caster.name, eligible);
  }, [caster.name, entriesWithDecklist, playerById]);

  const [explicitId, setExplicitId] = useState<number | undefined>(undefined);
  const [searchVisible, setSearchVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

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

  if (entriesWithDecklist.length === 0) return null;

  const showSearch = searchVisible || !selectedPlayer;

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className={`text-sm font-semibold ${accent}`}>{caster.name}</span>
        <span className="text-xs text-ctp-subtext0">({caster.deck})</span>
      </div>

      {selectedPlayer ? (
        <p className="mt-1 text-xs text-ctp-subtext1">
          {explicitId === undefined ? "Auto-matched to " : "Showing "}
          <Link to={`/events/${eventId}?tab=decklists&player=${selectedPlayer.id}`} className="text-ctp-blue hover:underline">
            {selectedPlayer.username}
          </Link>
          {"'s decklist. "}
          <button type="button" className="text-ctp-subtext0 hover:text-ctp-text hover:underline" onClick={() => setSearchVisible((v) => !v)}>
            {showSearch ? "Hide search" : "Not them? Search roster"}
          </button>
        </p>
      ) : (
        <p className="mt-1 text-xs text-ctp-subtext1">Not auto-matched — search the tournament roster below.</p>
      )}

      {showSearch && (
        <div className="relative mt-2 max-w-xs">
          <input
            type="text"
            aria-label={`Search players for ${caster.name}`}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 100)}
            placeholder="Search tournament roster…"
            className="w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
          />
          {searchOpen && search.trim() !== "" && (
            <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-ctp-surface1 bg-ctp-mantle shadow-lg">
              {searchMatches.length > 0 ? (
                searchMatches.map(({ player }) => (
                  <button
                    key={player.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setExplicitId(player.id);
                      setSearch("");
                      setSearchOpen(false);
                      setSearchVisible(false);
                    }}
                    className="block w-full px-3 py-1.5 text-left text-sm text-ctp-text hover:bg-ctp-surface0"
                  >
                    {player.username}
                  </button>
                ))
              ) : (
                <p className="px-3 py-1.5 text-sm text-ctp-subtext0">No players match &ldquo;{search.trim()}&rdquo;.</p>
              )}
            </div>
          )}
        </div>
      )}

      {selectedEntry && (
        <div className="mt-2">
          <DecklistView
            decklist={selectedEntry.decklist}
            cardsByName={cardsByName}
            deckId={`${eventId}:${selectedEntry.player}`}
            showThumbnails
            defaultDisplayMode="compact"
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
      <p className="text-xs text-ctp-subtext1">
        Pulled from{" "}
        <Link to={`/events/${eventId}?tab=decklists`} className="text-ctp-blue hover:underline">
          {bundle.event.name}
        </Link>
        &rsquo;s public tournament decklists — a separate population from the broadcast commentary. Caster call-outs
        don&rsquo;t always match the registered username exactly, so a match isn&rsquo;t always automatic.
      </p>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row">
        <PlayerDecklistSlot caster={match.players[0]} eventId={eventId} decklists={decklists} players={players} accent="text-ctp-blue" />
        <PlayerDecklistSlot caster={match.players[1]} eventId={eventId} decklists={decklists} players={players} accent="text-ctp-mauve" />
      </div>
    </div>
  );
}

export default function MatchDecklists({ match }: { match: BroadcastTimelineMatch }) {
  if (match.eventId === undefined) return null;
  return <MatchDecklistsForEvent match={match} eventId={match.eventId} />;
}
