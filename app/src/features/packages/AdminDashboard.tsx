import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { AdminOverview, EditorialPackage } from '@gatcg/shared';
import { accountApi } from '../../lib/accountApi';
import PageLayout from '../../components/layout/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import Panel from '../../components/ui/Panel';
import Button from '../../components/ui/Button';
import Tabs, { TabPanel } from '../../components/ui/Tabs';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import AdminPackageEditor from './AdminPackageEditor';
import AdminResearchQueue from './AdminResearchQueue';
import type { ResearchFinding } from './researchQueue';
import EditorialPackageCards from './EditorialPackageCards';

export default function AdminDashboard() {
  useDocumentTitle('Admin dashboard');
  const [access, setAccess] = useState<'loading' | 'signed-out' | 'denied' | 'allowed'>('loading');
  const [overview, setOverview] = useState<AdminOverview>();
  const [packages, setPackages] = useState<EditorialPackage[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const tab = location.hash === '#research' ? 'research' : location.hash === '#overview' ? 'overview' : 'packages';
  const [researchVisited, setResearchVisited] = useState(tab === 'research');
  useEffect(() => { if (tab === 'research') setResearchVisited(true); }, [tab]);
  const [editing, setEditing] = useState<EditorialPackage>();
  const [finding, setFinding] = useState<ResearchFinding>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const session = await accountApi.session();
      if (!session.user) { setAccess('signed-out'); return; }
      if (!(await accountApi.adminAccess()).admin) { setAccess('denied'); return; }
      setAccess('allowed');
      const [summary, library] = await Promise.all([accountApi.adminOverview(), accountApi.adminPackages()]);
      setOverview(summary); setPackages(library.packages);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Dashboard could not load.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return <PageLayout><PageHeader title="Admin dashboard" />
    {error && <div><p role="alert" className="text-ctp-red">{error}</p><Button onClick={() => void refresh()}>Retry dashboard</Button></div>}
    {loading && <p role="status">Loading dashboard…</p>}
    {access === 'signed-out' && <Link className="inline-flex min-h-12 items-center text-ctp-blue" to="/account">Sign in with your account</Link>}
    {access === 'denied' && <p role="alert">This account does not have administrator access.</p>}
    {access === 'allowed' && <>
      <Tabs baseId="admin" active={tab} onChange={next => navigate(`#${next}`, { replace: true })} tabs={[{ key: 'packages', label: 'Packages' }, { key: 'research', label: 'Research' }, { key: 'overview', label: 'Overview' }]} />
      <TabPanel baseId="admin" tab="packages" active={tab} className="space-y-4 py-4">
        <Button variant="primary" onClick={() => setEditing({ id: crypto.randomUUID(), definition: { v: 1, name: '', cards: [] }, status: 'draft', revision: 0, updatedAt: '' })}>New package</Button>
        {!loading && !error && !packages.some(pkg => !pkg.research?.dismissed) && <p>No packages yet.</p>}
        {packages.filter(pkg => !pkg.research?.dismissed).map(pkg => <Panel key={pkg.id}><h2 className="break-words text-lg font-semibold">{pkg.definition.name}</h2><p className="text-sm capitalize">{pkg.status} · Exact card list</p><EditorialPackageCards definition={pkg.definition} /><Button onClick={() => { setFinding(undefined); setEditing(pkg); }}>Edit {pkg.definition.name}</Button></Panel>)}
      </TabPanel>
      <TabPanel baseId="admin" tab="research" active={tab} keepMounted className="py-4">{researchVisited && <AdminResearchQueue ready={!loading && !error} packages={packages} onDismiss={async pkg => {
        const result = await accountApi.saveAdminPackage(pkg.id, { definition: pkg.definition, status: pkg.status, revision: pkg.revision, research: pkg.research });
        setPackages(current => [result.package, ...current.filter(item => item.id !== result.package.id)]);
      }} onReview={(pkg, source) => { setFinding(source); setEditing(pkg); }} />}</TabPanel>
      <TabPanel baseId="admin" tab="overview" active={tab} className="py-4">
        {overview && <><h2 className="mb-3 text-lg font-semibold">Saved decks</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Object.entries(overview.decks).map(([label, total]) => <Panel key={label}><p className="text-sm capitalize">{label}</p><p className="text-3xl font-semibold">{total.toLocaleString()}</p></Panel>)}</div><p className="mt-3 text-sm text-ctp-subtext1">Current deck lists, excluding site seed decks. Versions are not counted separately.</p><Button className="mt-3" disabled={loading} onClick={() => void refresh()}>Refresh totals</Button></>}
      </TabPanel>
    </>}
    {editing && <AdminPackageEditor key={editing.id} initial={editing} finding={finding} onDismiss={() => { setEditing(undefined); setFinding(undefined); }} onSaved={pkg => setPackages(current => [pkg, ...current.filter(item => item.id !== pkg.id)])} />}
  </PageLayout>;
}
