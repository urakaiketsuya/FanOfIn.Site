import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { MatchLogRecord } from "@gatcg/shared";
import { accountApi } from "../../lib/accountApi";
import { summarizeMatchLog, summarizeMatchLogGroups } from "../../lib/matchLog";
import Panel from "../../components/ui/Panel";

export default function DeckMatchLogSummary({ deckId }: { deckId: string }) {
  const [records, setRecords] = useState<MatchLogRecord[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setRecords(null); setFailed(false);
    void accountApi.matchLog(deckId).then(({ records: value }) => { if (active) setRecords(value); }, () => { if (active) { setRecords([]); setFailed(true); } });
    return () => { active = false; };
  }, [deckId]);
  const summary = useMemo(() => summarizeMatchLog(records ?? []), [records]);
  const opponents = useMemo(() => summarizeMatchLogGroups(records ?? [], "opponent").slice(0, 3), [records]);
  const plans = useMemo(() => summarizeMatchLogGroups(records ?? [], "sideboardPlan").slice(0, 3), [records]);
  return <Panel className="mt-5" data-component="DeckMatchLogSummary">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-ctp-text">Testing log</h2><p className="mt-1 text-xs text-ctp-subtext1">Self-recorded games associated with this saved deck.</p></div><Link to={`/match-log?deck=${encodeURIComponent(deckId)}`} className="inline-flex min-h-11 items-center rounded-lg border border-ctp-blue px-3 text-sm font-medium text-ctp-blue">Log a game</Link></div>
    {records === null ? <p className="mt-3 text-sm text-ctp-subtext0">Loading testing history…</p> : failed ? <p className="mt-3 text-sm text-ctp-red">Testing history could not be loaded.</p> : records.length === 0 ? <p className="mt-3 text-sm text-ctp-subtext0">No games are linked to this deck yet.</p> : <><div className="mt-3 grid grid-cols-3 gap-2"><Metric label="Games" value={`${summary.games}`} /><Metric label="Wins" value={`${summary.wins}`} /><Metric label="Points" value={`${Math.round((summary.matchPointRate ?? 0) * 100)}%`} /></div><p className="mt-2 text-xs text-ctp-subtext0">{summary.warning}</p><details className="mt-3"><summary className="flex min-h-11 cursor-pointer items-center text-sm text-ctp-blue">Opponent and plan breakdowns</summary><div className="grid gap-3 sm:grid-cols-2"><GroupList title="Opponents" groups={opponents} /><GroupList title="Sideboard plans" groups={plans} /></div><h3 className="mt-3 text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Recent games</h3><ul className="mt-2 space-y-2 text-xs text-ctp-subtext1">{records.slice(0, 5).map((record) => <li key={record.id} className="rounded-lg bg-ctp-base p-2"><span className="font-medium text-ctp-text">{record.result.toUpperCase()}</span> vs. {record.opponent || "unspecified opponent"}{record.sideboardPlan ? ` · ${record.sideboardPlan}` : ""}{record.gamePlanTurn != null ? ` · plan online turn ${record.gamePlanTurn}` : ""}</li>)}</ul></details></>}
  </Panel>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-ctp-base p-2"><p className="text-[10px] uppercase tracking-wide text-ctp-subtext0">{label}</p><p className="mt-1 font-semibold tabular-nums text-ctp-text">{value}</p></div>; }
function GroupList({ title, groups }: { title: string; groups: { label: string; games: number; matchPointRate: number }[] }) { return <section><h3 className="text-xs font-semibold text-ctp-text">{title}</h3>{groups.length === 0 ? <p className="mt-1 text-xs text-ctp-subtext0">No details logged.</p> : <ul className="mt-1 space-y-1 text-xs text-ctp-subtext1">{groups.map((group) => <li key={group.label}>{group.label}: {group.games} game{group.games === 1 ? "" : "s"} · {Math.round(group.matchPointRate * 100)}%</li>)}</ul>}</section>; }
