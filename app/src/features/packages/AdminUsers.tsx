import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { AdminRoleInput, AdminUserRoles } from '@gatcg/shared';
import { accountApi } from '../../lib/accountApi';
import Button from '../../components/ui/Button';
import Panel from '../../components/ui/Panel';
import DialogSheet from '../../components/ui/DialogSheet';

export default function AdminUsers({ currentUserId }: { currentUserId: string }) {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<AdminUserRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<AdminUserRoles>();
  const [saved, setSaved] = useState('');
  const fetchUsers = useCallback(async (query: string) => {
    setLoading(true); setError('');
    try { setUsers((await accountApi.adminUsers(query)).users); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Users could not load.'); }
    finally { setLoading(false); }
  }, []);
  function load(event?: FormEvent) { event?.preventDefault(); return fetchUsers(search.trim()); }
  useEffect(() => { void fetchUsers(''); }, [fetchUsers]);
  return <div className="space-y-4">
    <form onSubmit={load} className="flex flex-wrap gap-2"><label className="min-w-0 flex-1">Find user<input className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface2 bg-ctp-base px-3" value={search} maxLength={100} onChange={event => setSearch(event.target.value)} placeholder="Name or username" /></label><Button type="submit" disabled={loading} className="self-end">Search users</Button></form>
    {loading && <p role="status">Loading users…</p>}
    {error && <div><p role="alert" className="text-ctp-red">{error}</p><Button onClick={() => void load()}>Retry users</Button></div>}
    {saved && <p role="status">{saved}</p>}
    {!loading && !error && !users.length && <p>No users found.</p>}
    {!loading && !error && users.map(user => <Panel key={user.id}><div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0 break-words"><h2 className="font-semibold">{user.displayName}</h2>{user.profileSlug && <Link className="inline-flex min-h-12 items-center text-ctp-blue" to={`/users/${user.profileSlug}`}>@{user.profileSlug}</Link>}<p className="text-sm capitalize">{[user.communityRole, ...(user.reviewer ? ['Reviewer'] : []), ...(user.admin ? ['Administrator'] : [])].join(' · ')}</p></div><Button onClick={() => { setSaved(''); setEditing(user); }}>Edit roles<span className="sr-only"> for {user.displayName}</span></Button></div></Panel>)}
    <p className="text-sm text-ctp-subtext1">Up to 50 users. Search to narrow the list.</p>
    {editing && <RoleEditor key={editing.id} user={editing} currentUserId={currentUserId} onDismiss={() => setEditing(undefined)} onSaved={user => { setUsers(rows => rows.map(row => row.id === user.id ? user : row)); setSaved(`Roles saved for ${user.displayName}.`); setEditing(undefined); }} />}
  </div>;
}
function RoleEditor({ user, currentUserId, onDismiss, onSaved }: { user: AdminUserRoles; currentUserId: string; onDismiss: () => void; onSaved: (user: AdminUserRoles) => void }) {
  const [draft, setDraft] = useState<AdminRoleInput>({ communityRole: user.communityRole, reviewer: user.reviewer, admin: user.admin });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dirty = draft.communityRole !== user.communityRole || draft.reviewer !== user.reviewer || draft.admin !== user.admin;
  async function save() {
    setSaving(true); setError('');
    try { onSaved((await accountApi.saveAdminRoles(user.id, draft)).user); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Roles could not save.'); }
    finally { setSaving(false); }
  }
  return <DialogSheet title={`Roles for ${user.displayName}`} onDismiss={onDismiss} dirty={dirty} dismissible={!saving} footer={<div>{error && <p role="alert" className="text-ctp-red">{error}</p>}<Button variant="primary" disabled={saving || !dirty} onClick={() => void save()}>{saving ? 'Saving…' : 'Save roles'}</Button></div>}>
    <div className="space-y-4"><label className="block">Community role<select disabled={saving} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface2 bg-ctp-base px-3" value={draft.communityRole} onChange={event => setDraft({ ...draft, communityRole: event.target.value as AdminRoleInput['communityRole'] })}><option value="member">Member</option><option value="moderator">Moderator</option><option value="staff">Staff</option></select></label>
    <p className="text-sm text-ctp-subtext1">Moderators and staff can moderate comments and review card tags.</p>
    <label className="flex min-h-12 items-center gap-3"><input type="checkbox" disabled={saving} checked={draft.reviewer} onChange={event => setDraft({ ...draft, reviewer: event.target.checked })} />Reviewer — review card tags</label>
    <label className="flex min-h-12 items-center gap-3"><input type="checkbox" disabled={saving || user.id === currentUserId} checked={draft.admin} onChange={event => setDraft({ ...draft, admin: event.target.checked })} />Administrator — manage dashboard and roles</label>
    </div>
  </DialogSheet>;
}
