import { useMemo } from 'react';
import { regionalFieldReport } from '@gatcg/shared';
import { useOmnidexIndex, useOmnidexIndexStatus } from '../tournaments/data';
import { regionKeyForCountry, type RegionGroupMode } from '../../lib/regions';
import ReportValues from './ReportValues';
import Panel from '../../components/ui/Panel';
import PublishedSourceStatus from '../../components/PublishedSourceStatus';
export default function RegionalCompetitionReport({ region, group, label }: { region: string; group: RegionGroupMode; label: string }) {
  const index = useOmnidexIndex(), status = useOmnidexIndexStatus();
  const report = useMemo(() => regionalFieldReport(index?.events ?? [], e => regionKeyForCountry(e.hostCountry, group) === region), [index, region, group]);
  return <section aria-label="Regional field report" className="my-6 space-y-4"><h2 className="text-xl font-semibold">What is played here versus elsewhere?</h2><PublishedSourceStatus label="Regional fields" status={status} hasData={!!index} />{report && <p className="text-xs text-ctp-subtext1">{report.from} – {report.to} · Physical events · All tiers · Ranked + unranked</p>}{index && !report?.formats.length && <p>Comparable fields unavailable.</p>}{report?.formats.slice().sort((a,b) => b.scopes[0].entries - a.scopes[0].entries).map(f => <Panel key={f.format} className="space-y-4"><h3 className="text-lg font-semibold capitalize">{f.format}</h3><div className="grid gap-2 sm:grid-cols-2">{f.scopes.map((s, i) => <p key={i} className="text-sm text-ctp-subtext1">{i === 0 ? label : 'Other countries'} · {s.entries} entries · {s.complete}/{s.events} complete fields</p>)}</div>{!f.rows.length ? <p>Local field composition unavailable.</p> : <ReportValues rows={f.rows.slice(0, 6).map(r => ({ ...r, counts: [...r.counts].reverse(), values: [...r.values].reverse() }))} labels={['Other countries', label]} champions countLabel="entries" />}<p className="text-xs text-ctp-subtext1">{f.rows.slice(0, 6).map(r => `${r.name}: ${r.events}/${f.scopes[0].complete} local fields`).join(' · ')}</p></Panel>)}</section>;
}
