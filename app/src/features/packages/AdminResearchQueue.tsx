import { useEffect, useMemo, useState, useTransition } from 'react';
import { Link } from 'react-router-dom';
import type { EditorialPackage } from '@gatcg/shared';
import Button from '../../components/ui/Button';
import Panel from '../../components/ui/Panel';
import PackageCardGrid from '../cards/PackageCardGrid';
import { useCardCatalog } from '../cards/useCardCatalog';
import { researchDraft, researchFindings, researchSources, researchStatus, type ResearchFinding, type ResearchKind } from './researchQueue';

const field = 'min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 py-2 focus-visible:outline-2 focus-visible:outline-ctp-blue';
export default function AdminResearchQueue({ packages, onReview, ready }: { packages: EditorialPackage[]; onReview: (pkg: EditorialPackage, finding?: ResearchFinding) => void; ready: boolean }) {
  const [findings, setFindings] = useState<ResearchFinding[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<ResearchKind | ''>('');
  const [status, setStatus] = useState('Needs review');
  const [limit, setLimit] = useState(12);
  const [pending, startTransition] = useTransition();
  const cards = useCardCatalog();
  const catalog = useMemo(() => new Map(cards.map(card => [card.name, card])), [cards]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setErrors([]);
    void Promise.allSettled((Object.keys(researchSources) as ResearchKind[]).map(async source => {
      const response = await fetch(researchSources[source].url, { signal: controller.signal });
      if (!response.ok) throw new Error(`${researchSources[source].label} unavailable`);
      try { return await researchFindings(source, await response.json()); }
      catch { throw new Error(`${researchSources[source].label} could not be read`); }
    })).then(results => {
      if (controller.signal.aborted) return;
      startTransition(() => {
        setFindings(results.flatMap(r => r.status === 'fulfilled' ? r.value : []));
        setErrors(results.flatMap(r => r.status === 'rejected' ? [r.reason instanceof Error ? r.reason.message : 'Research unavailable'] : []));
        setLoading(false);
      });
    });
    return () => controller.abort();
  }, [attempt]);
  const rows = useMemo(() => {
    const saved = new Map(packages.filter(p => p.research).map(p => [p.research!.key, p]));
    const current = new Set(findings.map(f => f.research.key));
    return [...findings.map(finding => ({ finding, saved: saved.get(finding.research.key) })), ...packages.filter(p => p.research && !current.has(p.research.key)).map(saved => ({ finding: undefined, saved }))];
  }, [findings, packages]);
  const filtered = rows.filter(row => {
    const state = researchStatus(row.saved, row.finding);
    return (!kind || (row.finding?.research.kind ?? row.saved?.research?.kind) === kind) && (!status || (status === 'Needs review' ? state === 'Needs review' || state === 'Updated evidence' : state === status)) &&
      (!query.trim() || [row.finding?.name, row.saved?.definition.name, ...(row.finding?.cards ?? row.saved?.definition.cards.map(c => c.name) ?? [])].some(text => text?.toLowerCase().includes(query.trim().toLowerCase())));
  });
  return <section className="space-y-4" aria-label="Research review queue">
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="text-sm">Find a package or card<input type="search" className={field} value={query} onChange={e => { setQuery(e.target.value); setLimit(12); }} /></label>
      <label className="text-sm">Source<select aria-label="Source" className={field} value={kind} onChange={e => { setKind(e.target.value as ResearchKind | ''); setLimit(12); }}><option value="">All research</option>{Object.entries(researchSources).map(([key, source]) => <option key={key} value={key}>{source.label}</option>)}</select></label>
      <label className="text-sm">Review status<select aria-label="Review status" className={field} value={status} onChange={e => { setStatus(e.target.value); setLimit(12); }}>{['Needs review', 'Draft', 'Approved', 'Dismissed', ''].map(value => <option key={value} value={value}>{value || 'All statuses'}</option>)}</select></label>
    </div>
    {(loading || pending) && <p role="status">Loading research…</p>}
    {!!errors.length && <div><p role="alert">{errors.join('. ')}</p><Button onClick={() => setAttempt(a => a + 1)}>Retry research</Button></div>}
    {!ready && <p role="status">Load saved reviews before editing research.</p>}
    {!loading && <p role="status">{filtered.length ? `${filtered.length} ${filtered.length === 1 ? 'finding' : 'findings'}` : 'No findings match these filters.'}</p>}
    {filtered.slice(0, limit).map(({ finding, saved }) => {
      const research = finding?.research ?? saved!.research!;
      return <Panel key={research.key}>
        <h2 className="break-words text-lg font-semibold">{saved?.definition.name ?? finding!.name}</h2>
        <p className="text-sm">{researchSources[research.kind].label} · {researchStatus(saved, finding)}</p>
        <p className="mt-3 text-sm text-ctp-subtext1">{finding ? 'Research card pool' : 'Saved exact card list'}</p>
        <PackageCardGrid names={finding?.cards ?? [...new Set(saved!.definition.cards.map(c => c.name))]} cardsByName={catalog} />
        {finding && <p className="mt-3 break-words text-sm">{finding.summary}</p>}
        {!finding && !loading && !errors.length && <p className="mt-3 text-sm">No longer in the current research report.</p>}
        <div className="mt-3 flex flex-wrap gap-2"><Button disabled={!ready} variant="primary" onClick={() => onReview(saved ?? researchDraft(finding!, catalog), finding)}>Review finding</Button>
          <Link target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center px-3 text-ctp-blue" to={finding?.href ?? `/cards/packages?review=1${researchSources[research.kind].hash}`}>Source research</Link></div>
      </Panel>;
    })}
    {filtered.length > limit && <Button onClick={() => setLimit(n => n + 12)}>Show more findings</Button>}
  </section>;
}
