import type { Card } from "@gatcg/shared";
import { useCardCatalog } from "../cards/useCardCatalog";
import CardArtTile from "../../components/CardArtTile";
import Button from "../../components/ui/Button";
import { usePublishedDataStatus } from "../../lib/sync/usePublishedData";
import { useMemo, type ReactNode } from "react";
import Tabs, { TabPanel } from "../../components/ui/Tabs";
import PageHeader from "../../components/ui/PageHeader";
import { useTabParam } from "../../lib/useTabParam";
import { useSimulatorSummaryData } from "./data";
import { Link, useSearchParams } from "react-router-dom";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageLayout from "../../components/layout/PageLayout";
import Section from "../../components/ui/Section";
import { InlineState } from "../../components/ui/ContentState";

function SimulatorCard({ id, name, cards }: { id: string; name?: string | null; cards: Map<string, Card> }) {
  const card = cards.get(id);
  const label = card?.name ?? name ?? id;
  return card ? (
    <Link to={`/cards/${card.slug}`} className="inline-flex min-h-control items-center gap-2 rounded text-ctp-blue hover:underline focus-visible:outline-2 focus-visible:outline-ctp-blue">
      <span aria-hidden="true" className="block w-10 shrink-0"><CardArtTile card={card} name={label} /></span>
      <span>{label}</span>
    </Link>
  ) : <span className="break-all">{label}</span>;
}

function formatPercent(rate: number | null): string {
  return rate === null ? "–" : `${(rate * 100).toFixed(0)}%`;
}

function formatAvg(value: number): string {
  return value.toFixed(1);
}

const VIEWS = ["overview", "cards", "turns"] as const;
const CARD_METRICS = ["Games", "Win rate", "Avg drawn", "Avg materialized", "Avg activated", "Avg discarded", "Avg reserved", "Attacks", "Avg damage dealt", "Lethal hits"];
const TURN_METRICS = ["Games", "Avg cards played", "Avg memory spent", "Avg reserve spent", "Avg damage dealt", "Avg damage taken", "Avg healed", "Avg level", "Avg HP"];

function SimulatorMetrics({ title, labels, rows }: {
  title: string;
  labels: string[];
  rows: { id: string | number; identity: ReactNode; values: (string | number)[] }[];
}) {
  return <>
    <ul className="mt-3 space-y-2 md:hidden">
      {rows.map(row => <li key={row.id} className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3">
        <div className="text-sm font-medium">{row.identity}</div>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
          {labels.map((label, index) => <div key={label}>
            <dt className="text-xs text-ctp-subtext1">{label}</dt>
            <dd className="font-medium tabular-nums">{row.values[index]}</dd>
          </div>)}
        </dl>
      </li>)}
    </ul>
    <div className="mt-3 hidden overflow-x-auto md:block">
      <table className="w-full text-left text-sm">
        <thead><tr className="text-xs text-ctp-subtext0">
          <th scope="col" className="min-w-32 p-2 font-medium">{title}</th>
          {labels.map(label => <th key={label} scope="col" className="p-2 font-medium">{label}</th>)}
        </tr></thead>
        <tbody>{rows.map(row => <tr key={row.id} className="border-t border-ctp-surface0">
          <th scope="row" className="p-2 font-medium">{row.identity}</th>
          {labels.map((label, index) => <td key={label} className="p-2 tabular-nums">{row.values[index]}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
  </>;
}

export default function SimulatorIndex() {
  useDocumentTitle("Simulator Data", "Match statistics from GAO and Clarent.");
  const data = useSimulatorSummaryData();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useTabParam("tab", VIEWS, "overview");
  const source = params.get("source") === "gao" ? "gao" : "clarent";
  const sourceLabel = source === "gao" ? "GAO" : "Clarent";
  const submitted = data?.matchSources?.find(row => row.sourceId === source);
  const catalog = useCardCatalog();
  const cards = useMemo(() => {
    const result = new Map<string, Card>();
    for (const card of catalog) {
      result.set(card.uuid, card);
      result.set(card.slug, card);
    }
    return result;
  }, [catalog]);
  const status = usePublishedDataStatus("simulator-summary", "/data/simulator/summary.json");

  const champions = useMemo(() => [...(data?.champions ?? [])].sort((a, b) => b.games - a.games), [data]);
  const matchups = useMemo(() => [...(data?.matchups ?? [])].sort((a, b) => b.games - a.games), [data]);
  const cardStats = useMemo(() => [...(data?.cardStats ?? [])].sort((a, b) => b.games - a.games), [data]);
  const weapons = useMemo(() => [...(data?.weapons ?? [])].sort((a, b) => b.games - a.games), [data]);
  const turnStats = useMemo(() => [...(data?.turnStats ?? [])].sort((a, b) => a.turn - b.turn), [data]);

  return (
    <PageLayout data-component="SimulatorIndex">
      <PageHeader title="Simulator Data" />
      <label className="mt-4 flex max-w-xs flex-col gap-1 text-sm text-ctp-text">
        Source
        <select aria-label="Source" value={source}
          className="min-h-12 rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-ctp-text focus-visible:outline-2 focus-visible:outline-ctp-blue"
          onChange={event => { const next = new URLSearchParams(params); next.set("source", event.target.value); setParams(next); }}>
          <option value="clarent">Clarent</option>
          <option value="gao">GAO</option>
        </select>
      </label>

      <p className="mt-3 text-sm text-ctp-subtext1">Experimental data · <Link to="/methodology#simulator-data" className="inline-flex min-h-control items-center text-ctp-blue hover:underline">Data coverage</Link></p>

      {status.phase === "error" && <div role="alert" className="mt-6 text-sm text-ctp-red"><p>{data ? "Showing saved data. " : ""}{status.error}</p><Button className="mt-2" onClick={status.retry}>Retry loading</Button></div>}
      {!data && status.phase !== "error" && <InlineState className="mt-6">Loading…</InlineState>}

      {data && (source === "gao" || (submitted?.matches ?? 0) > 0) && (
        <Section className="mt-6" heading="dense" title={`${sourceLabel} match submissions`}>
          {!submitted ? <InlineState>Source statistics are not available in this published snapshot yet.</InlineState>
            : submitted.matches === 0 ? <InlineState>No {sourceLabel} matches submitted yet.</InlineState>
            : <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                ["Matches", submitted.matches], ["Drawn matches", submitted.draws],
                ["Deck snapshots", submitted.decks], ["Games", submitted.games],
                ["First-player win rate", `${formatPercent(submitted.firstPlayer.winRate)} (${submitted.firstPlayer.wins}/${submitted.firstPlayer.games} reported games)`],
                ["Avg game length", submitted.avgTurns === null ? "–" : `${formatAvg(submitted.avgTurns)} turns (${submitted.gamesWithTurns} reported games)`],
              ].map(([label, value]) => <div key={label}><dt className="text-sm text-ctp-subtext1">{label}</dt><dd className="font-medium text-ctp-text">{value}</dd></div>)}
            </dl>}
        </Section>
      )}

      {data && source === "clarent" && (
        <div className="mt-6">
          <Tabs baseId="simulator-view" label="Simulator statistics" active={view} onChange={setView} variant="pill" wrap
            tabs={[{ key: "overview", label: "Overview" }, { key: "cards", label: "Cards and weapons" }, { key: "turns", label: "Turns" }]} />
          <TabPanel baseId="simulator-view" tab="overview" active={view} className="mt-4 space-y-6">
          <div className="rounded-lg border border-ctp-surface1 p-4">
            <Section heading="dense" title="Clarent game telemetry">
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <div>
                <span className="text-ctp-subtext1">Games recorded: </span>
                <span className="font-medium text-ctp-text">{data.games}</span>
              </div>
              <div>
                <span className="text-ctp-subtext1">First-player win rate: </span>
                <span className="font-medium text-ctp-text">
                  {formatPercent(data.firstPlayer.winRate)} ({data.firstPlayer.wins}/{data.firstPlayer.games})
                </span>
              </div>
              <div>
                <span className="text-ctp-subtext1">Avg game length: </span>
                <span className="font-medium text-ctp-text">
                  {/* `typeof` guard, not `=== null` – a cached/stale published file from before
                      avgTurns existed leaves it `undefined`, not `null`; formatAvg(undefined)
                      would throw. See TopDecksList.tsx for the same pre-refresh-window pattern. */}
                  {typeof data.avgTurns === "number" ? `${formatAvg(data.avgTurns)} turns` : "–"}
                </span>
              </div>
            </div>
            </Section>
          </div>

          <Section
            heading="dense"
            title="Champions"
          >
            {champions.length === 0 ? (
              <InlineState className="mt-2 text-sm">No champion data yet.</InlineState>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-ctp-subtext0">
                      <th className="pb-1 pr-3 font-normal">Champion</th>
                      <th className="pb-1 pr-3 font-normal">Element</th>
                      <th className="pb-1 pr-3 font-normal">Record</th>
                      <th className="pb-1 font-normal">Win rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {champions.map((c) => (
                      <tr key={c.championId} className="border-t border-ctp-surface0">
                        <td className="py-1.5 pr-3 text-ctp-text">
                          <SimulatorCard id={c.championId} name={c.championName} cards={cards} />
                        </td>
                        <td className="py-1.5 pr-3 text-ctp-subtext1">{c.element}</td>
                        <td className="py-1.5 pr-3 text-ctp-subtext1">
                          {c.wins}-{c.games - c.wins}
                        </td>
                        <td className="py-1.5 text-ctp-text">{formatPercent(c.winRate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section heading="dense" title="Matchups">
            {matchups.length === 0 ? (
              <InlineState className="mt-2 text-sm">No matchup data yet.</InlineState>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {matchups.map((m) => (
                  <li key={`${m.champion1}__${m.champion2}`} className="flex flex-wrap items-center gap-2">
                    <SimulatorCard id={m.champion1} name={m.champion1Name} cards={cards} />
                    <span className="text-ctp-subtext0">vs</span>
                    <SimulatorCard id={m.champion2} name={m.champion2Name} cards={cards} />
                    <span className="text-ctp-subtext1">
                      – {m.champion1Wins}-{m.champion2Wins} across {m.games} game{m.games === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          </TabPanel>
          <TabPanel baseId="simulator-view" tab="cards" active={view} className="mt-4 space-y-6">
            <Section heading="dense" title="Card stats" description="5-game minimum">
              {cardStats.length === 0 ? <InlineState>No card has reached 5 games yet.</InlineState> : (
                <SimulatorMetrics title="Card" labels={CARD_METRICS} rows={cardStats.map(card => ({
                  id: card.cardId,
                  identity: <SimulatorCard id={card.cardId} cards={cards} />,
                  values: [
                    card.games, formatPercent(card.winRate), formatAvg(card.avgDrawn), formatAvg(card.avgMaterialized),
                    formatAvg(card.avgActivated), formatAvg(card.avgDiscarded), formatAvg(card.avgReserved),
                    card.attackEvents, formatAvg(card.avgDamageDealt), card.lethalHits,
                  ],
                }))} />
              )}
            </Section>
            <Section heading="dense" title="Weapons" description="5-game minimum">
              {weapons.length === 0 ? <InlineState>No weapon has reached 5 games yet.</InlineState> : (
                <SimulatorMetrics title="Weapon" labels={["Games", "Attacks", "Cleave rate"]} rows={weapons.map(weapon => ({
                  id: weapon.weaponCardId,
                  identity: <SimulatorCard id={weapon.weaponCardId} cards={cards} />,
                  values: [weapon.games, weapon.attackEvents, formatPercent(weapon.cleaveRate)],
                }))} />
              )}
            </Section>
          </TabPanel>
          <TabPanel baseId="simulator-view" tab="turns" active={view} className="mt-4">
            <Section heading="dense" title="Turn stats" description="5-game minimum per turn">
              {turnStats.length === 0 ? <InlineState>No turn has reached 5 games yet.</InlineState> : (
                <SimulatorMetrics title="Turn" labels={TURN_METRICS} rows={turnStats.map(turn => ({
                  id: turn.turn,
                  identity: `Turn ${turn.turn}`,
                  values: [
                    turn.games, formatAvg(turn.avgCardsPlayed), formatAvg(turn.avgMemorySpent), formatAvg(turn.avgReserveSpent),
                    formatAvg(turn.avgDamageDealt), formatAvg(turn.avgDamageTaken), formatAvg(turn.avgHealed), formatAvg(turn.avgLevel),
                    formatAvg(turn.avgHp),
                  ],
                }))} />
              )}
            </Section>
          </TabPanel>
        </div>
      )}
    </PageLayout>
  );
}
