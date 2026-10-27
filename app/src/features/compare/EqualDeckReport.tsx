import { useMemo, useState } from 'react';
import { REPORT_DRAW_CHECKPOINTS, type OmnidexDecklist } from '@gatcg/shared';
import { useCardCatalog } from '../cards/useCardCatalog';
import Button from '../../components/ui/Button';
import CardArtTile from '../../components/CardArtTile';
import { Link } from 'react-router-dom';
import Panel from '../../components/ui/Panel';
import { sectionCounts, reportAccess, pairMembership } from './equalDeckReportModel';
import { type ComparedDeck } from './types';

export default function EqualDeckReport({ decks, decklists, onRetry }: { decks: ComparedDeck[]; decklists: Map<string, OmnidexDecklist | null>; onRetry: () => void }) {
  const catalog = useCardCatalog();
  const cards = useMemo(() => new Map(catalog.map(c => [c.name, c])), [catalog]);
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [seen, setSeen] = useState(10);
  const [two, setTwo] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const rows = useMemo(() => decks.map(deck => {
    const list = decklists.get(deck.key);
    const main = sectionCounts(list?.main ?? []);
    return { deck, list, main, size: [...main.values()].reduce((a, b) => a + b, 0) };
  }), [decks, decklists]);
  const names = useMemo(() => [...new Set(rows.flatMap(r => [...r.main.keys()]))].sort(), [rows]);
  const a = names.includes(first) ? first : names[0] ?? '';
  const b = names.includes(second) && second !== a ? second : names.find(n => n !== a) ?? '';
  const selected = rows.filter(r => picked.includes(r.deck.key) && r.list);
  const access = (r: typeof rows[number], name: string) => reportAccess(r.list ? r.main : null, name, seen);
  const toggle = (key: string) => setPicked(previous => {
    const current = previous.filter(k => rows.some(r => r.deck.key === k && r.list));
    return current.includes(key) ? current.filter(k => k !== key) : current.length < 2 ? [...current, key] : current;
  });
  if (decks.length < 2) return <p>Add at least two decks to compare.</p>;
  return <div className="space-y-5" data-component="EqualDeckReport">
    <h2 className="text-lg font-semibold">Compare draw access</h2>
    <div className="flex flex-wrap items-end gap-3">
      <label className="min-w-0 max-w-full text-sm">Find card<select aria-label="First outcome card" className="mt-1 block min-h-control w-full max-w-72 rounded border border-ctp-surface1 bg-ctp-base p-2" value={a} onChange={e => setFirst(e.target.value)} disabled={!names.length}>{!names.length && <option value="">No Main cards available</option>}{names.map(n => <option key={n}>{n}</option>)}</select></label>
      {two && <label className="min-w-0 max-w-full text-sm">Compare with<select aria-label="Second outcome card" className="mt-1 block min-h-control w-full max-w-72 rounded border border-ctp-surface1 bg-ctp-base p-2" value={b} onChange={e => setSecond(e.target.value)}>{names.filter(n => n !== a).map(n => <option key={n}>{n}</option>)}</select></label>}
      <label className="text-sm">Cards seen<select className="mt-1 block min-h-control rounded border border-ctp-surface1 bg-ctp-base p-2" value={seen} onChange={e => setSeen(Number(e.target.value))}>{REPORT_DRAW_CHECKPOINTS.map(n => <option key={n}>{n}</option>)}</select></label>
      <Button aria-pressed={two} disabled={names.length < 2} onClick={() => setTwo(v => !v)}>{two ? 'Show one outcome' : 'Compare two outcomes'}</Button>
    </div>
    <p className="text-xs text-ctp-subtext1">Chance to draw at least one · Main library · no mulligan or search</p>
    {a && <div className="flex flex-wrap gap-3" aria-label="Selected outcome cards">{[a, ...(two && b ? [b] : [])].map(name => { const card = cards.get(name); const content = <><CardArtTile card={card} name={name} artworkOnly /><span className="mt-1 block break-words text-xs">{name}</span></>; return card ? <Link key={name} className="block w-32 rounded focus-visible:outline-2 focus-visible:outline-ctp-blue" to={`/cards/${card.slug}`}>{content}</Link> : <div key={name} className="w-32">{content}</div>; })}</div>}
    {two && b && <div>
      <p className="break-words text-xs">Y: {b} access (%)</p>
      <div className="relative mx-8 mb-10 mt-3 h-72 border border-ctp-surface1" aria-label="Draw access tradeoffs">
        {[0, 50, 100].map(n => <div key={n}><span className="absolute bottom-0 top-0 border-l border-ctp-surface0" style={{ left: `${n}%` }} /><span className="absolute inset-x-0 border-t border-ctp-surface0" style={{ bottom: `${n}%` }} /><span className="absolute -bottom-7 -translate-x-1/2 text-xs" style={{ left: `${n}%` }}>{n}%</span><span className="absolute -left-8 translate-y-1/2 text-xs" style={{ bottom: `${n}%` }}>{n}</span></div>)}
        {(() => {
          const groups = new Map<string, { x: number; y: number; indices: number[] }>();
          rows.forEach((r,i) => { const x=access(r,a), y=access(r,b); if (x===null || y===null) return; const key=`${x}:${y}`; const group=groups.get(key) ?? {x,y,indices:[]}; group.indices.push(i); groups.set(key,group); });
          return [...groups.entries()].map(([key,g]) => <span key={key} role="img" aria-label={g.indices.map(i => `${rows[i].deck.label}: ${g.x.toFixed(1)}% X, ${g.y.toFixed(1)}% Y`).join('; ')} className="absolute h-2 w-2 -translate-x-1/2 translate-y-1/2 rounded-full bg-ctp-blue" style={{left:`${g.x}%`,bottom:`${g.y}%`}}><span className={`absolute whitespace-nowrap rounded bg-ctp-base px-1 text-xs text-ctp-text ${g.indices[0] % 2 ? 'right-3 top-2' : 'bottom-2 left-3'}`}>{g.indices.map(i=>i+1).join(', ')}</span></span>);
        })()}
      </div><p className="break-words text-center text-xs">X: {a} access (%)</p>
      <p className="mt-2 text-xs text-ctp-subtext1">Select decks below. Shared markers identify equal access.</p>
    </div>}
    {rows.some(r => decklists.has(r.deck.key) && !r.list) && <Button onClick={onRetry}>Retry unavailable decklists</Button>}
    <div aria-label="Deck outcomes" className="space-y-1">{[...rows].sort((x,y) => two ? 0 : (access(y,a) ?? -1) - (access(x,a) ?? -1)).map(r => { const value = access(r,a); const index = rows.indexOf(r); return <div key={r.deck.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-ctp-surface0 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
      <label className="flex min-h-control min-w-0 items-center gap-2 text-sm"><input type="checkbox" checked={selected.some(s => s.deck.key === r.deck.key)} disabled={!r.list || (selected.length === 2 && !selected.some(s => s.deck.key === r.deck.key))} onChange={() => toggle(r.deck.key)} /><span className="break-words">{two ? `${index + 1}. ` : ''}{r.deck.label}<span className="block text-xs text-ctp-subtext1">{r.list ? `${r.size} Main · ${r.main.get(a) ?? 0} copies` : decklists.has(r.deck.key) ? 'Decklist unavailable' : 'Loading decklist…'}</span></span></label>
      <div aria-hidden="true" className="relative order-3 col-span-2 mx-2 mb-3 h-1 bg-ctp-surface0 sm:order-none sm:col-span-1 sm:mb-0">{value !== null && <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ctp-blue" style={{ left: `${value}%` }} />}</div>
      <span className="text-right tabular-nums">{value === null ? '—' : `${value.toFixed(1)}%${two ? ' X' : ''}`}{two && <span className="block text-xs">{access(r,b) === null ? '—' : `${access(r,b)!.toFixed(1)}%`} Y</span>}</span>
    </div>; })}</div>
    {!two && <p className="text-xs text-ctp-subtext1">Draw access · 0–100% scale</p>}
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Inspect two decks</h3><Button onClick={() => setPicked([])} disabled={!picked.length}>Clear selection</Button></div>
    <p className="text-xs text-ctp-subtext1">{selected.length === 2 ? 'Two selected · deselect one to inspect another.' : 'Select two decks to inspect shared and distinctive cards.'}</p>
    {selected.length === 2 && <div aria-live="polite" className="space-y-5">{(['main','material'] as const).map(section => {
      const maps = selected.map(r => sectionCounts(r.list![section]));
      const membership = pairMembership(maps[0], maps[1]);
      return <Panel key={section}><h3 className="mb-3 font-semibold">{section === 'main' ? 'Main' : 'Material'}</h3>{['Different quantities','Distinctive cards','Shared core'].map(group => {
        const lines = membership.filter(row => row.group === group);
        return <section key={group} className="mt-4"><h4 className="mb-2 text-sm font-medium">{group} · {lines.length}</h4>{lines.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{lines.map(line => { const card = cards.get(line.name); const content = <><CardArtTile card={card} name={line.name} /><span className="mt-2 block break-words text-sm font-medium">{line.name}</span></>; return <div key={line.name} className="min-w-0">{card ? <Link className="block rounded focus-visible:outline-2 focus-visible:outline-ctp-blue" to={`/cards/${card.slug}`}>{content}</Link> : content}{selected.map((r,j) => <p key={r.deck.key} className="mt-1 break-words text-xs">{r.deck.label}: <strong>{maps[j].get(line.name) ?? 0} {(maps[j].get(line.name) ?? 0) === 1 ? 'copy' : 'copies'}</strong></p>)}</div>; })}</div> : <p className="text-xs text-ctp-subtext1">None</p>}</section>;
      })}</Panel>;
    })}</div>}
  </div>;
}
