import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { DraftTheme, DraftThemeMatch, summarizeDraftThemes } from "@gatcg/shared";
import reviewedSnapshotUrl from "../../../../data/reference/reviewed-theme-evidence.json?url";
import Tabs, { TabPanel } from "../../components/ui/Tabs";
import snapshotUrl from "../../../../data/reference/draft-theme-evidence.json?url";
import PageLayout from "../../components/layout/PageLayout";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import DisclosureChevron from "../../components/DisclosureChevron";
import ArchetypePreview from "./ArchetypePreview";
import { useCardsByNames } from "../events/useCardsByNames";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

type Snapshot = { status: 'draft' | 'reviewed'; eligibleDecks: number; evidence: (Omit<DraftTheme, 'status'> & { status: 'draft' | 'reviewed'; matches: DraftThemeMatch[] })[]; review: ReturnType<typeof summarizeDraftThemes> };

export default function DraftThemeReview() {
  useDocumentTitle("Themes");
  const [active, setActive] = useState<'reviewed' | 'draft'>('reviewed');
  return <PageLayout width="wide">
    <PageHeader title="Themes" />
    <Link className="inline-flex min-h-12 items-center text-ctp-blue" to="/archetypes">Back to archetypes</Link>
    <p className="mb-4">Themes describe related cards in a deck. They are separate from archetypes and verified combos; membership does not establish competitive strength.</p>
    <Tabs baseId="theme-status" label="Theme review status" active={active} onChange={setActive} tabs={[{ key: 'reviewed', label: 'Reviewed themes' }, { key: 'draft', label: 'Draft candidates' }]} />
    {(['reviewed', 'draft'] as const).map(status => <TabPanel key={status} baseId="theme-status" tab={status} active={active} keepMounted><ThemeEvidence status={status} /></TabPanel>)}
  </PageLayout>;
}

function ThemeEvidence({ status }: { status: Snapshot['status'] }) {
  const label = status === 'reviewed' ? 'reviewed theme' : 'draft candidate';
  const [data, setData] = useState<Snapshot>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    fetch(status === 'reviewed' ? reviewedSnapshotUrl : snapshotUrl, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Snapshot unavailable");
      const next = await response.json() as Snapshot;
      if (next.status !== status || !Array.isArray(next.evidence) || !Array.isArray(next.review)) throw new Error("Invalid snapshot");
      setData(next);
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [attempt, status]);
  const entries = data?.evidence.filter(entry => entry.name.toLowerCase().includes(query.trim().toLowerCase())) ?? [];
  return <section className="mt-4">
    <p>{status === 'reviewed' ? 'Reviewed membership rules: Elysian Dante includes direct Elysian allies and supported token paths.' : 'Candidates awaiting individual review. Draft Elysian Dante retains its earlier baseline for comparison.'}</p>
    {data && <p className="mt-2 text-sm text-ctp-subtext0">Fixed review snapshot: {data.eligibleDecks.toLocaleString()} eligible decks across the source history. Counts overlap and are not current metagame shares. Sideboards are excluded.</p>}
    <label className="mt-4 block" htmlFor={`${status}-theme-search`}>Find a theme</label>
    <input id={`${status}-theme-search`} className="mt-1 min-h-12 w-full rounded border border-ctp-surface1 bg-ctp-mantle px-3" value={query} onChange={event => setQuery(event.target.value)} />
    {error ? <div role="alert" className="my-4"><p>Theme evidence could not be loaded.</p><Button onClick={() => setAttempt(value => value + 1)}>Retry</Button></div> : !data ? <p role="status" className="my-4">Loading theme evidence…</p> : <>
      <p role="status" className="my-4">{entries.length} {label}{entries.length === 1 ? '' : 's'}</p>
      {!entries.length && <p>No themes match your search.</p>}
      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">{entries.map(entry => <ThemeReview key={entry.id} entry={entry} data={data} />)}</div>
    </>}
  </section>;
}

function ThemeReview({ entry, data }: { entry: Snapshot['evidence'][number]; data: Snapshot }) {
  const [visible, setVisible] = useState(5);
  const summary = data.review.find(item => item.id === entry.id);
  const example = entry.matches[0];
  const names = [...new Set(example?.paths.flatMap(path => path.cards) ?? entry.paths.flatMap(path => path.flatMap(condition => condition.names ?? [])))];
  const images = useCardsByNames(names);
  return <article id={`${data.status}-${entry.id}`} className="min-w-0 rounded-lg border border-ctp-surface1 p-4">
    <h2 className="text-lg font-semibold">{entry.name}</h2>
    <p className="mb-3 text-sm text-ctp-subtext0">{data.status === 'reviewed' ? 'Reviewed' : 'Draft'} {entry.kind} · {summary?.decks ?? entry.matches.length} matching decks</p>
    <ArchetypePreview names={names} cardImages={images} />
    <p className="my-3 text-xs">{example ? `Matching cards from example deck ${example.deckId}; not the full card pool or a required core.` : 'Named rule cards; no matching example available.'}</p>
    <details><summary className="flex min-h-12 cursor-pointer items-center gap-2"><DisclosureChevron />Rules and overlaps</summary>
      <p className="my-2 text-sm">Each path is an alternative. Every condition within a path must pass. Minimums count distinct card names, not copies. Identity means Main + Material.</p>
      {entry.paths.map((path, i) => <div key={i} className="my-3"><h3 className="font-medium">Path {i + 1} · {summary?.paths[i]?.decks ?? 0} decks</h3><ul className="list-disc space-y-2 pl-5 text-sm">{path.map((condition, j) => <li key={j}>At least {condition.minimum} distinct name{condition.minimum === 1 ? '' : 's'} in {condition.section}: {[condition.type, condition.subtypes?.join(' or '), condition.prefix && `name starts with “${condition.prefix}”`, condition.names?.join(' / ')].filter(Boolean).join('; ')}.</li>)}</ul></div>)}
      <p className="my-2 text-sm">{summary?.exclusiveDecks ?? 0} decks match no other {data.status} label in this snapshot.</p>
      <h3 className="font-medium">Shared membership</h3>
      <p className="text-xs">Overlaps are measured only within this tab’s snapshot, not across reviewed and draft themes or archetypes.</p>
      {summary?.overlaps.length ? summary.overlaps.map(overlap => <p className="my-2 text-sm" key={overlap.id}>{data.evidence.find(other => other.id === overlap.id)?.name ?? overlap.id}: {overlap.decks} shared decks</p>) : <p className="text-sm">No overlaps with other {data.status} labels in this snapshot.</p>}
    </details>
    <details><summary className="flex min-h-12 cursor-pointer items-center gap-2"><DisclosureChevron />Matching decks ({entry.matches.length})</summary>
      <p className="text-xs">All qualifying cards are listed for each path. Decks may pass more than one path.</p>
      {entry.matches.slice(0, visible).map(match => {
        const [event, player] = match.deckId.split(':');
        return <div key={match.deckId} className="my-3 border-t border-ctp-surface1"><Link className="inline-flex min-h-12 items-center text-ctp-blue" to={`/events/${event}?tab=decklists&player=${player}`}>View deck {match.deckId}</Link>{match.paths.map(path => <p key={path.path} className="mb-2 break-words text-xs">Path {path.path + 1}: {path.cards.join(' · ')}</p>)}</div>;
      })}
      {!entry.matches.length && <p>No matching decks in this snapshot.</p>}
      {visible < entry.matches.length && <Button onClick={() => setVisible(count => count + 10)}>Show more decks</Button>}
    </details>
  </article>;
}
