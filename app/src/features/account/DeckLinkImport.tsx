import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { parseFractalDeckLink, type DeckFormat, type DeckImportResult, type DeckLinkPreview } from '@gatcg/shared';
import { accountApi } from '../../lib/accountApi';
import DeckPreviewCard from '../../components/DeckPreviewCard';
import DeckCardPreview from '../../components/DeckCardPreview';
import Button from '../../components/ui/Button';
import { useCardCatalog } from '../cards/useCardCatalog';
import { findDeckChampionName } from '../../lib/ttsExport';

export default function DeckLinkImport({ url, setUrl, onImported, onClose, run, footerTarget }: {
  footerTarget?: HTMLElement | null;
  url: string; setUrl: (value: string) => void; run: (action: () => Promise<void>) => Promise<void>;
  onImported: (result: DeckImportResult) => Promise<void>; onClose: () => void;
}) {
  const [preview, setPreview] = useState<DeckLinkPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fallback, setFallback] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [format, setFormat] = useState<DeckFormat>('UNKNOWN');
  const cards = useCardCatalog();
  const byName = useMemo(() => new Map(cards.map(card => [card.name, card])), [cards]);
  const champion = preview ? findDeckChampionName(preview.decklist.material, byName) : null;
  const missing = preview && cards.length ? [...preview.decklist.material, ...preview.decklist.main, ...preview.decklist.sideboard].filter(line => !byName.has(line.card)) : [];
  async function load(origin: 'fractal' | 'omnidex') {
    setBusy(true); setError(''); setPreview(null); setFallback(false);
    try {
      const ref = parseFractalDeckLink(url);
      try {
        const next = await accountApi.previewDeckLink(url, origin);
        setPreview(next); setTitle(next.title); setExpanded(false); setFormat('UNKNOWN');
      } catch (failure) { setFallback(origin === 'fractal' && !ref.topcut); throw failure; }
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not load this deck.'); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!preview) return;
    setBusy(true); setError('');
    try {
      const result = await accountApi.saveDeck({ title, format, championName: champion, decklist: preview.decklist,
        source: { provider: 'manual', externalDeckId: `fractal:${preview.eventId}:${preview.playerId}:${preview.topcut ? 'topcut' : 'swiss'}:${preview.origin}`, label: preview.origin === 'fractal' ? 'Fractal of Insight' : 'Omnidex archive via Fractal link', sourceUrl: preview.sourceUrl,
          metadata: { eventId: preview.eventId, playerId: preview.playerId, topcut: preview.topcut, origin: preview.origin } } });
      await onImported({ requested: 1, created: result.created ? 1 : 0, linked: result.created ? 0 : 1, skipped: 0, failures: [] });
      setUrl(''); onClose();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save this deck. Your preview is still available.'); }
    finally { setBusy(false); }
  }
  const confirmation = <div className="space-y-2">
    {error && <p role="alert" className="text-sm text-ctp-red">{error}</p>}
    {preview && <Button variant="primary" disabled={busy || !title.trim()} onClick={() => void run(save)}>{busy ? 'Importing…' : 'Import to My Decks'}</Button>}
  </div>;
  return <div className="mt-4 space-y-4" aria-busy={busy}>
    <label className="block text-sm">Fractal deck link<input type="url" value={url} disabled={busy} onChange={event => { setUrl(event.target.value); setPreview(null); setError(''); setFallback(false); }} placeholder="https://fractalofin.site/…#deck_…" className="mt-2 min-h-12 w-full min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-base px-3" /></label>
    <p className="text-sm text-ctp-subtext1">Open a deck on Fractal and copy its permalink. The link must identify a specific deck.</p>
    <Button disabled={busy || !url.trim()} onClick={() => void run(() => load('fractal'))}>{busy ? 'Working…' : 'Preview deck'}</Button>
    {footerTarget ? createPortal(confirmation, footerTarget) : confirmation}
    {fallback && <div className="space-y-2"><p className="text-sm text-ctp-subtext1">Our Omnidex archive may contain a different version of this list.</p><Button disabled={busy} onClick={() => void run(() => load('omnidex'))}>Preview Omnidex archive instead</Button></div>}
    {preview && <>
      <DeckPreviewCard cardLinksNewTab cardsByName={byName} model={{ id: preview.exportPath, title: preview.title, decklist: preview.decklist, championName: champion, source: { kind: 'event', label: preview.origin === 'fractal' ? 'Fractal of Insight' : 'Omnidex archive' }, metadata: <span>{preview.topcut ? 'Top cut list' : 'Swiss list'} · <a href={preview.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center text-ctp-blue underline">Original source</a></span> }} view={{ expanded, onToggle: () => setExpanded(!expanded), content: <div className="space-y-4 p-4">{(['material', 'main', 'sideboard'] as const).map(section => <section key={section}><h3 className="mb-2 font-semibold capitalize">{section}</h3><DeckCardPreview newTab groupByElement={section === 'main'} lines={preview.decklist[section].map(line => ({ name: line.card, quantity: line.quantity }))} cardsByName={byName} /></section>)}</div> }} />
      {missing.length > 0 && <p role="status" className="text-sm text-ctp-yellow">Cards not found in our catalog: {missing.map(line => line.card).join(', ')}. Their names and quantities will be retained.</p>}
      <label className="block text-sm">Deck name<input value={title} maxLength={160} disabled={busy} onChange={event => setTitle(event.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3" /></label>
      <label className="block text-sm">Format<select value={format} disabled={busy} onChange={event => setFormat(event.target.value as DeckFormat)} className="mt-2 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3"><option value="UNKNOWN">Unknown</option><option value="STANDARD">Standard</option><option value="PANTHEON">Pantheon</option></select></label>
      <p className="text-sm text-ctp-subtext1">Saves an editable copy. Collection quantities stay unchanged.</p>
    </>}
  </div>;
}
