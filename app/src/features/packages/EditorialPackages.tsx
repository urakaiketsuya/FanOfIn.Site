import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { encodePackage, type EditorialPackage } from '@gatcg/shared';
import { accountApi } from '../../lib/accountApi';
import Panel from '../../components/ui/Panel';
import Button from '../../components/ui/Button';
import EditorialPackageCards from './EditorialPackageCards';
export default function EditorialPackages({ query }: { query: string }) {
  const [packages, setPackages] = useState<EditorialPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function load() {
    setLoading(true); setError('');
    try { setPackages((await accountApi.publishedPackages()).packages); }
    catch { setError('Editor packages could not load.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  return <section aria-label="Editor packages" className="space-y-4">
    {loading && <p role="status">Loading editor packages…</p>}
    {error && <div><p role="alert">{error}</p><Button onClick={() => void load()}>Retry editor packages</Button></div>}
    {packages.filter(pkg => !query || [pkg.definition.name, ...pkg.definition.cards.map(card => card.name)].some(value => value.toLowerCase().includes(query))).map(pkg => <Panel key={pkg.id}><h2 className="break-words text-lg font-semibold">{pkg.definition.name}</h2><p className="text-sm text-ctp-subtext1">Exact card list</p><EditorialPackageCards definition={pkg.definition} /><Link className="inline-flex min-h-12 items-center rounded px-3 text-ctp-blue focus-visible:outline-2" to={`/cards/packages/shared?p=${encodePackage(pkg.definition)}`}>Open package</Link></Panel>)}
  </section>;
}
