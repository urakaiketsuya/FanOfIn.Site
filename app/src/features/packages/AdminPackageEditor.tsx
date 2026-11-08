import { useMemo, useState } from 'react';
import type { EditorialPackage, SharedPackageCard } from '@gatcg/shared';
import { accountApi } from '../../lib/accountApi';
import CardResult from '../../components/CardResult';
import Button from '../../components/ui/Button';
import DialogSheet from '../../components/ui/DialogSheet';
import { useCardCatalog } from '../cards/useCardCatalog';

const field = 'min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 py-2 focus-visible:outline-2 focus-visible:outline-ctp-blue';
export default function AdminPackageEditor({ initial, onDismiss, onSaved }: { initial: EditorialPackage; onDismiss: () => void; onSaved: (pkg: EditorialPackage) => void }) {
  const [saved, setSaved] = useState(initial);
  const [name, setName] = useState(initial.definition.name);
  const [cards, setCards] = useState<SharedPackageCard[]>(initial.definition.cards);
  const [status, setStatus] = useState(initial.status);
  const [cardName, setCardName] = useState('');
  const [section, setSection] = useState<'main' | 'material'>('main');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false);
  const catalog = useCardCatalog();
  const art = useMemo(() => new Map(catalog.map(card => [card.name, card])), [catalog]);
  const definition = { ...saved.definition, name, cards };
  const dirty = JSON.stringify(definition) !== JSON.stringify(saved.definition) || status !== saved.status || !!cardName.trim();
  function add() {
    const value = cardName.trim();
    if (!value || value.length > 80) { setError('Enter a card name of up to 80 characters.'); return; }
    if (cards.some(card => card.name === value && card.section === section)) { setError('That card is already in this section.'); return; }
    if (cards.length >= 60) { setError('A package can hold up to 60 card lines.'); return; }
    setCards([...cards, { name: value, section, quantity: 1 }]); setCardName(''); setError(''); setNotice('');
  }
  async function save() {
    setBusy(true); setError(''); setNotice(''); setConflict(false);
    try { const result = await accountApi.saveAdminPackage(saved.id, { definition, status, revision: saved.revision }); setSaved(result.package); setName(result.package.definition.name); onSaved(result.package); setNotice(status === 'published' ? 'Package published.' : 'Draft saved.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save. Your changes are still here.'); setConflict(reason instanceof Error && 'status' in reason && reason.status === 409); }
    finally { setBusy(false); }
  }
  async function reload() {
    setBusy(true); setError('');
    try {
      const latest = (await accountApi.adminPackages()).packages.find(pkg => pkg.id === saved.id);
      if (!latest) throw new Error('Saved package could not be found.');
      setSaved(latest); setName(latest.definition.name); setCards(latest.definition.cards); setStatus(latest.status); setCardName(''); setConflict(false); onSaved(latest);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not reload the package.'); }
    finally { setBusy(false); }
  }
  return <DialogSheet title={initial.revision ? 'Edit package' : 'New package'} onDismiss={onDismiss} dirty={dirty} dismissible={!busy} footer={<div>{error && <p role="alert" className="mb-2 text-sm text-ctp-red">{error}</p>}{conflict && <Button disabled={busy} onClick={() => void reload()}>Reload saved version (discard edits)</Button>}{notice && <p role="status" className="mb-2 text-sm">{notice}</p>}<Button variant="primary" disabled={busy || !name.trim() || !cards.length || (!dirty && saved.revision > 0)} onClick={() => void save()}>{busy ? 'Saving…' : status === 'published' ? 'Publish package' : 'Save draft'}</Button></div>}>
    <fieldset disabled={busy} className="min-w-0 space-y-5">
      <div><h3 className="font-semibold">Exact card list · {cards.length} cards</h3>{!cards.length && <p className="mt-2 text-sm text-ctp-subtext1">Add the cards for this package.</p>}
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{cards.map((card, index) => <CardResult newTab key={`${card.section}:${card.name}`} card={art.get(card.name)} name={card.name}>
          <p className="text-sm capitalize">{card.section}</p><label className="block text-sm">Copies of {card.name}<select className={field} value={card.quantity} onChange={event => setCards(cards.map((line, i) => i === index ? { ...line, quantity: Number(event.target.value) } : line))}>{[1, 2, 3, 4].map(n => <option key={n}>{n}</option>)}</select></label>
          <Button aria-label={`Remove ${card.name} from ${card.section}`} onClick={() => setCards(cards.filter((_, i) => i !== index))}>Remove</Button>
        </CardResult>)}</div>
      </div>
      <div className="space-y-3"><label className="block text-sm">Card name<input className={field} list="admin-card-names" value={cardName} maxLength={80} onChange={event => setCardName(event.target.value)} /></label><datalist id="admin-card-names">{catalog.map(card => <option key={card.name} value={card.name} />)}</datalist>
        <label className="block text-sm">Section<select aria-label="Section" className={field} value={section} onChange={event => setSection(event.target.value as 'main' | 'material')}><option value="main">Main</option><option value="material">Material</option></select></label><Button onClick={add}>Add card</Button></div>
      <label className="block text-sm">Package name<input className={field} value={name} maxLength={80} onChange={event => setName(event.target.value)} /></label>
      <label className="block text-sm">Status<select aria-label="Status" className={field} value={status} onChange={event => setStatus(event.target.value as 'draft' | 'published')}><option value="draft">Draft</option><option value="published">Published</option></select></label>
    </fieldset>
  </DialogSheet>;
}
