import { useEffect, useMemo, useRef, useState } from "react";
import type { Card, CommunityCoOccurrenceEntry } from "@gatcg/shared";
import ElementRail from "../../../components/ElementRail";
import CardHoverPreview from "../../../components/CardHoverPreview";
import type { BuddyCard } from "../useBuddyCards";
import Section from "../../../components/ui/Section";

interface BuddyGroup {
  cardName: string;
  /** Which of the viewer's locked cards this card pairs with, each with its own co-occurrence rate, best first. */
  withLocked: { name: string; coOccurrenceRate: number; count: number }[];
}

/**
 * Inverts the per-locked-card buddy lists (`{lockedName: BuddyCard[]}`) into one entry per
 * recommended card, so a card that pairs well with several of the viewer's locks is shown once —
 * not duplicated under each lock — and sorted with the strongest multi-lock signals first.
 */
function groupBuddiesByCard(
  groups: { name: string; buddies: { cardName: string; coOccurrenceRate: number; count: number }[] }[],
): BuddyGroup[] {
  const byCard = new Map<string, { name: string; coOccurrenceRate: number; count: number }[]>();
  for (const { name, buddies } of groups) {
    for (const b of buddies) {
      const list = byCard.get(b.cardName);
      const entry = { name, coOccurrenceRate: b.coOccurrenceRate, count: b.count };
      if (list) list.push(entry);
      else byCard.set(b.cardName, [entry]);
    }
  }
  return Array.from(byCard.entries())
    .map(([cardName, withLocked]) => ({
      cardName,
      withLocked: withLocked.sort((a, b) => b.coOccurrenceRate - a.coOccurrenceRate),
    }))
    .sort((a, b) => b.withLocked.length - a.withLocked.length || b.withLocked[0].coOccurrenceRate - a.withLocked[0].coOccurrenceRate);
}

interface BuddyConnectionPath {
  key: string;
  d: string;
  rate: number;
  candidateName: string;
}

const INITIAL_BUDDY_CANDIDATES = 5;
const INITIAL_DESKTOP_CONNECTIONS = 3;

/** Responsive relationship view: a bipartite map on desktop and expandable candidate cards on
 * mobile. Both encode the same rates/counts; neither calls co-occurrence causal synergy. */
function BuddyRelationshipView({
  title,
  description,
  groups,
  cardsByName,
  onAdd,
}: {
  title: string;
  description: string;
  groups: BuddyGroup[];
  cardsByName: Map<string, Card>;
  onAdd: (name: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const visibleGroups = useMemo(
    () => showAll ? groups : groups.slice(0, INITIAL_BUDDY_CANDIDATES),
    [groups, showAll],
  );
  const [selectedName, setSelectedName] = useState<string | null>(visibleGroups[0]?.cardName ?? null);
  const [showAllConnections, setShowAllConnections] = useState(false);
  const [expandedMobile, setExpandedMobile] = useState<string | null>(visibleGroups[0]?.cardName ?? null);
  const mapRef = useRef<HTMLDivElement>(null);
  const lockedRefs = useRef(new Map<string, HTMLDivElement>());
  const candidateRefs = useRef(new Map<string, HTMLDivElement>());
  const [paths, setPaths] = useState<BuddyConnectionPath[]>([]);
  const selected = visibleGroups.find((group) => group.cardName === selectedName) ?? visibleGroups[0];
  const selectedRelationships = useMemo(
    () => selected ? (showAllConnections ? selected.withLocked : selected.withLocked.slice(0, INITIAL_DESKTOP_CONNECTIONS)) : [],
    [selected, showAllConnections],
  );

  useEffect(() => {
    if (!visibleGroups.some((group) => group.cardName === selectedName)) setSelectedName(visibleGroups[0]?.cardName ?? null);
  }, [visibleGroups, selectedName]);

  useEffect(() => setShowAllConnections(false), [selectedName]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const draw = () => {
      const bounds = map.getBoundingClientRect();
      if (!selected) {
        setPaths([]);
        return;
      }
      setPaths(selectedRelationships.flatMap((relationship) => {
        const from = lockedRefs.current.get(relationship.name)?.getBoundingClientRect();
        const to = candidateRefs.current.get(selected.cardName)?.getBoundingClientRect();
        if (!from || !to) return [];
        const x1 = from.right - bounds.left;
        const y1 = from.top + from.height / 2 - bounds.top;
        const x2 = to.left - bounds.left;
        const y2 = to.top + to.height / 2 - bounds.top;
        const bend = Math.max(28, (x2 - x1) * 0.4);
        return [{
          key: `${relationship.name}:${selected.cardName}`,
          d: `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`,
          rate: relationship.coOccurrenceRate,
          candidateName: selected.cardName,
        }];
      }));
    };
    const frame = requestAnimationFrame(draw);
    const observer = new ResizeObserver(draw);
    observer.observe(map);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [visibleGroups, selected, selectedRelationships]);

  return (
    <section className="mt-4 border-t border-ctp-surface0 pt-3 first:mt-2 first:border-t-0 first:pt-0">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">{title}</h3>
      <p className="mt-1 text-xs text-ctp-subtext0">{description}</p>

      <div ref={mapRef} className="relative mt-3 hidden grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)] gap-24 sm:grid">
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible">
          {paths.map((path) => (
            <path
              key={path.key}
              d={path.d}
              fill="none"
              stroke="currentColor"
              strokeWidth={1 + path.rate * 5}
              className="text-ctp-blue opacity-80"
            />
          ))}
        </svg>
        <div className="relative z-10">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Linked to selected candidate</p>
          <div className="space-y-2">
            {selectedRelationships.map((relationship) => (
              <div
                key={relationship.name}
                ref={(node) => { if (node) lockedRefs.current.set(relationship.name, node); else lockedRefs.current.delete(relationship.name); }}
                className="flex items-center justify-between gap-2 rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-xs font-medium text-ctp-text"
              >
                <span className="truncate">{relationship.name}</span>
                <span className="shrink-0 text-[10px] font-semibold text-ctp-green">{Math.round(relationship.coOccurrenceRate * 100)}% · n={relationship.count}</span>
              </div>
            ))}
          </div>
          {selected && selected.withLocked.length > INITIAL_DESKTOP_CONNECTIONS && (
            <button type="button" onClick={() => setShowAllConnections((value) => !value)} className="mt-2 min-h-9 text-xs text-ctp-blue hover:underline">
              {showAllConnections ? "Show strongest 3" : `Show ${selected.withLocked.length - INITIAL_DESKTOP_CONNECTIONS} more connections`}
            </button>
          )}
        </div>
        <div className="relative z-10">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Best shared relationships</p>
            <span className="text-[10px] text-ctp-subtext0">Line thickness = pairing rate</span>
          </div>
          <div className="space-y-2">
            {visibleGroups.map((group) => {
              const cardInfo = cardsByName.get(group.cardName);
              return (
                <div
                  key={group.cardName}
                  ref={(node) => { if (node) candidateRefs.current.set(group.cardName, node); else candidateRefs.current.delete(group.cardName); }}
                  className={`relative flex items-center gap-2 overflow-hidden rounded-md border bg-ctp-base py-2 pl-3 pr-2 ${selected?.cardName === group.cardName ? "border-ctp-blue ring-1 ring-inset ring-ctp-blue/30" : "border-ctp-surface1"}`}
                >
                  <ElementRail elements={cardInfo?.elements} />
                  <button type="button" aria-pressed={selected?.cardName === group.cardName} onClick={() => setSelectedName(group.cardName)} className="min-w-0 flex-1 text-left">
                    <CardHoverPreview image={cardInfo?.editions[0]?.image} alt={group.cardName}>
                      <span className="block truncate text-xs font-semibold text-ctp-text">{group.cardName}</span>
                    </CardHoverPreview>
                    <span className="block text-[10px] text-ctp-subtext0">
                      <span className="font-semibold text-ctp-green">{Math.round(group.withLocked[0].coOccurrenceRate * 100)}%</span>
                      {" strongest · "}{group.withLocked.length} locked card{group.withLocked.length === 1 ? "" : "s"} · n={group.withLocked[0].count}
                    </span>
                  </button>
                  <button type="button" onClick={() => onAdd(group.cardName)} className="min-h-9 rounded-md border border-ctp-surface1 px-2 text-xs text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-blue">+ Add</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selected && (
        <p className="mt-2 hidden text-[11px] text-ctp-subtext0 sm:block">
          <span className="font-semibold text-ctp-text">{selected.cardName}</span>{" pairs with "}
          {selectedRelationships.map((relationship) => `${relationship.name} in ${Math.round(relationship.coOccurrenceRate * 100)}% (n=${relationship.count})`).join(", ")} of supported decks
          {!showAllConnections && selected.withLocked.length > INITIAL_DESKTOP_CONNECTIONS ? ` · ${selected.withLocked.length - INITIAL_DESKTOP_CONNECTIONS} more hidden` : ""}.
        </p>
      )}

      <div className="mt-3 space-y-2 sm:hidden">
        {visibleGroups.map((group) => {
          const cardInfo = cardsByName.get(group.cardName);
          const expanded = expandedMobile === group.cardName;
          return (
            <div key={group.cardName} className="relative overflow-hidden rounded-md border border-ctp-surface1 bg-ctp-base py-2 pl-3 pr-2">
              <ElementRail elements={cardInfo?.elements} />
              <div className="flex items-center gap-2">
                <button type="button" aria-expanded={expanded} onClick={() => setExpandedMobile(expanded ? null : group.cardName)} className="min-h-9 min-w-0 flex-1 text-left">
                  <CardHoverPreview image={cardInfo?.editions[0]?.image} alt={group.cardName}>
                    <span className="block truncate text-sm font-semibold text-ctp-text">{group.cardName}</span>
                  </CardHoverPreview>
                  <span className="block text-[10px] text-ctp-subtext0">
                    <span className="font-semibold text-ctp-green">{Math.round(group.withLocked[0].coOccurrenceRate * 100)}%</span>
                    {" strongest · "}{group.withLocked.length} locked card{group.withLocked.length === 1 ? "" : "s"} · n={group.withLocked[0].count}
                  </span>
                </button>
                <button type="button" onClick={() => onAdd(group.cardName)} className="min-h-11 rounded-md border border-ctp-surface1 px-3 text-xs text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-blue">+ Add</button>
              </div>
              {expanded && (
                <div className="mt-2 space-y-2 border-t border-ctp-surface0 pt-2">
                  {group.withLocked.map((relationship) => (
                    <div key={relationship.name}>
                      <div className="flex justify-between gap-3 text-[11px]">
                        <span className="truncate text-ctp-subtext1">{relationship.name}</span>
                        <span className="shrink-0 text-ctp-subtext0">{Math.round(relationship.coOccurrenceRate * 100)}% · n={relationship.count}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ctp-surface1">
                        <div className="h-full rounded-full bg-ctp-blue" style={{ width: `${relationship.coOccurrenceRate * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {groups.length > INITIAL_BUDDY_CANDIDATES && (
        <button type="button" onClick={() => setShowAll((value) => !value)} className="mt-2 min-h-9 text-xs text-ctp-blue hover:underline">
          {showAll ? "Show fewer" : `Show ${groups.length - INITIAL_BUDDY_CANDIDATES} more`}
        </button>
      )}
    </section>
  );
}

export default function BuddyCardsList({
  lockedNames,
  buddyCards,
  communityBuddyCards,
  cardsByName,
  onAdd,
}: {
  lockedNames: string[];
  buddyCards: Map<string, BuddyCard[]>;
  communityBuddyCards: Map<string, CommunityCoOccurrenceEntry[]>;
  cardsByName: Map<string, Card>;
  onAdd: (name: string) => void;
}) {
  const groups = lockedNames.map((name) => ({ name, buddies: buddyCards.get(name) ?? [] })).filter((g) => g.buddies.length > 0);
  const communityGroups = lockedNames
    .map((name) => ({ name, buddies: communityBuddyCards.get(name) ?? [] }))
    .filter((g) => g.buddies.length > 0);
  if (groups.length === 0 && communityGroups.length === 0) {
    return (
      <Section
        data-component="BuilderBuddyPanel"
        className="mt-6"
        heading="dense"
        title="Buddy cards"
        description={lockedNames.length === 0
          ? "Keep a card to see what's most often run alongside it."
          : "No buddy suggestions right now — either everything commonly run alongside your choices is already in the build, or this Champion/Spirit population is too thin to say (a build with many user choices often narrows it down to just a few decks)."}
      >
        {null}
      </Section>
    );
  }
  const merged = groupBuddiesByCard(groups);
  const communityMerged = groupBuddiesByCard(communityGroups);
  return (
    <Section
      data-component="BuilderBuddyPanel"
      className="mt-6"
      heading="dense"
      title="Buddy cards"
      description="Cards most often run alongside your choices, regardless of win rate. Thicker connections and longer mobile bars mean a higher pairing rate; sample counts show how many decks contained both cards. Frequent pairing is a lead to investigate, not proof of synergy."
    >
      {merged.length > 0 && (
        <BuddyRelationshipView
          title="Tournament relationships"
          description="Drawn from matching tournament decklists; no win-rate filter is applied."
          groups={merged}
          cardsByName={cardsByName}
          onAdd={onAdd}
        />
      )}

      {communityMerged.length > 0 && (
        <BuddyRelationshipView
          title="Community relationships"
          description="The same co-occurrence view using community decklists instead of tournament data."
          groups={communityMerged}
          cardsByName={cardsByName}
          onAdd={onAdd}
        />
      )}
    </Section>
  );
}

/** Same composition/rating stats as a deck's own dedicated page (DeckDetail.tsx), recomputed live from whatever's currently assembled — updates as cards get locked, added, or removed. */
/** "tournament" ranks by real Omnidex win-rate lift (useSuggestedBuild); "community" ranks by
 * the blended community population's popularity (useCommunitySuggestedBuild) — no win/loss data, so pillar
 * tuning and lift-specific UI are unavailable in this mode. "balanced" is still useSuggestedBuild's
 * real lift-ranked build — same adjustedLift/conditionalWinRate numbers as "tournament" — just with
 * community popularity nudging the ranking order alongside any pillar bias, so it keeps full
 * lift-specific UI (pillar tuning, removal suggestions) unlike "community". The default source. See
 * docs/CALCULATIONS.md, "Community population" and "Balanced source". */
