import { Link } from 'react-router-dom';
import type { ResearchFinding } from './researchQueue';
import { useMemo, useState } from 'react';
import type { EditorialPackage, SharedPackageCard } from '@gatcg/shared';
import { accountApi } from '../../lib/accountApi';
import CardResult from '../../components/CardResult';
import Button from '../../components/ui/Button';
import DialogSheet from '../../components/ui/DialogSheet';
import { useCardCatalog } from '../cards/useCardCatalog';

const field = 'min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 py-2 focus-visible:outline-2 focus-visible:outline-ctp-blue';
export default function AdminPackageEditor({ initial, finding, onDismiss, onSaved }: { initial: EditorialPackage; finding?: ResearchFinding; onDismiss: () => void; onSaved: (pkg: EditorialPackage) => void }) {
  const [saved, setSaved] = useState(initial);
  const [name, setName] = useState(initial.definition.name);
  const [cards, setCards] = useState<SharedPackageCard[]>(initial.definition.cards);
  const [status, setStatus] = useState(initial.status);
  const [dismissed, setDismissed] = useState(initial.research?.dismissed ?? false);
  const [confirmed, setConfirmed] = useState(false);
  const [cardName, setCardName] = useState('');
  const [section, setSection] = useState<'main' | 'material'>('main');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false);
  const catalog = useCardCatalog();
  const art = useMemo(() => new Map(catalog.map(card => [card.name, card])), [catalog]);
  const definition = { ...saved.definition, name, cards };
  const research = saved.research ? { ...(finding?.research ?? saved.research), dismissed } : undefined;
  const dirty = JSON.stringify(research) !== JSON.stringify(saved.research) || JSON.stringify(definition) !== JSON.stringify(saved.definition) || status !== saved.status || !!cardName.trim();
  function add() {
    const value = cardName.trim();
    if (!value || value.length > 80) { setError('Enter a card name of up to 80 characters.'); return; }
    if (cards.some(card => card.name === value && card.section === section)) { setError('That card is already in this section.'); return; }
    if (cards.length >= 60) { setError('A package can hold up to 60 card lines.'); return; }
    setConfirmed(false); setCards([...cards, { name: value, section, quantity: 1 }]); setCardName(''); setError(''); setNotice('');
  }
  async function save() {
    setBusy(true); setError(''); setNotice(''); setConflict(false);
    try { const result = await accountApi.saveAdminPackage(saved.id, { definition, status, revision: saved.revision, ...(research ? { research } : {}) }); setSaved(result.package); setName(result.package.definition.name); onSaved(result.package); setNotice(dismissed ? 'Finding dismissed.' : status === 'published' ? 'Package published.' : 'Draft saved.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save. Your changes are still here.'); setConflict(reason instanceof Error && 'status' in reason && reason.status === 409); }
    finally { setBusy(false); }
  }
  async function reload() {
    setBusy(true); setError('');
    try {
      const latest = (await accountApi.adminPackages()).packages.find(pkg => pkg.id === saved.id);
      if (!latest) throw new Error('Saved package could not be found.');
      setSaved(latest); setName(latest.definition.name); setCards(latest.definition.cards); setStatus(latest.status); setCardName(''); setDismissed(latest.research?.dismissed ?? false); setConfirmed(false); setConflict(false); onSaved(latest);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not reload the package.'); }
    finally { setBusy(false); }
  }
  return <DialogSheet title={initial.research ? 'Review research finding' : initial.revision ? 'Edit package' : 'New package'} onDismiss={onDismiss} dirty={dirty} dismissible={!busy} footer={<div>{error && <p role="alert" className="mb-2 text-sm text-ctp-red">{error}</p>}{conflict && <Button disabled={busy} onClick={() => void reload()}>Reload saved version (discard edits)</Button>}{notice && <p role="status" className="mb-2 text-sm">{notice}</p>}<Button variant="primary" disabled={busy || !name.trim() || !cards.length || (!!research && status === 'published' && !confirmed) || (!dirty && saved.revision > 0)} onClick={() => void save()}>{busy ? 'Saving…' : dismissed ? 'Dismiss finding' : status === 'published' ? research ? 'Approve and publish' : 'Publish package' : 'Save draft'}</Button></div>}>
    <fieldset disabled={busy} className="min-w-0 space-y-5" onChange={() => setConfirmed(false)}>
      {saved.revision === 0 && cards.length > 0 && <p className="text-sm">Starting quantities are 1 copy. Review cards, sections and copies before approval.</p>}
      <div><h3 className="font-semibold">Exact card list · {cards.length} cards</h3>{!cards.length && <p className="mt-2 text-sm text-ctp-subtext1">Add the cards for this package.</p>}
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{cards.map((card, index) => <CardResult newTab key={`${card.section}:${card.name}`} card={art.get(card.name)} name={card.name}>
          <label className="block text-sm">Section<select aria-label={`Section for ${card.name}`} className={field} value={card.section} onChange={event => {
            const next = event.target.value as 'main' | 'material';
            if (cards.some((line, i) => i !== index && line.name === card.name && line.section === next)) { setError('That card is already in this section.'); return; }
            setCards(cards.map((line, i) => i === index ? { ...line, section: next } : line));
          }}><option value="main">Main</option><option value="material">Material</option></select></label><label className="block text-sm">Copies<select aria-label={`Copies of ${card.name}`} className={field} value={card.quantity} onChange={event => setCards(cards.map((line, i) => i === index ? { ...line, quantity: Number(event.target.value) } : line))}>{[1, 2, 3, 4].map(n => <option key={n}>{n}</option>)}</select></label>
          <Button aria-label={`Remove ${card.name} from ${card.section}`} onClick={() => { setConfirmed(false); setCards(cards.filter((_, i) => i !== index)); }}>Remove</Button>
        </CardResult>)}</div>
      </div>
      <div className="space-y-3"><label className="block text-sm">Card name<input className={field} list="admin-card-names" value={cardName} maxLength={80} onChange={event => setCardName(event.target.value)} /></label><datalist id="admin-card-names">{catalog.map(card => <option key={card.name} value={card.name} />)}</datalist>
        <label className="block text-sm">Section<select aria-label="Section" className={field} value={section} onChange={event => setSection(event.target.value as 'main' | 'material')}><option value="main">Main</option><option value="material">Material</option></select></label><Button onClick={add}>Add card</Button></div>
      <label className="block text-sm">Package name<input className={field} value={name} maxLength={80} onChange={event => setName(event.target.value)} /></label>
      {finding && <div className="space-y-2 text-sm"><h3 className="font-semibold">Source evidence</h3><p>{finding.summary}</p>{finding.evidence.map((text, index) => <p key={index} className="break-words">{text}</p>)}<Link target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center text-ctp-blue" to={finding.href}>Open source research</Link></div>}
      <label className="block text-sm">{research ? 'Review decision' : 'Status'}<select aria-label={research ? 'Review decision' : 'Status'} className={field} value={dismissed ? 'dismissed' : status} onChange={event => { setDismissed(event.target.value === 'dismissed'); setStatus(event.target.value === 'published' ? 'published' : 'draft'); }}><option value="draft">Draft</option><option value="published">{research ? 'Approve and publish' : 'Published'}</option>{research && <option value="dismissed">Dismiss</option>}</select></label>
    </fieldset>
    {research && status === 'published' && <label className="mt-4 flex min-h-12 items-center gap-3 text-sm"><input type="checkbox" className="h-6 w-6 shrink-0" disabled={busy} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />I reviewed the evidence and this exact card list for publication.</label>}
  </DialogSheet>;
}
