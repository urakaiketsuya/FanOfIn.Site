import { useEffect, useState } from "react";
import type { AccountUser } from "@gatcg/shared";
import { Link } from "react-router-dom";
import { accountApi } from "../../lib/accountApi";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import GoogleSignInButton from "./GoogleSignInButton";
import PageLayout from "../../components/layout/PageLayout";

export default function AccountIndex() {
  useDocumentTitle("Account", "Manage your Fan of Insight account and public profile.");
  const [user, setUser] = useState<AccountUser | null>();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { void accountApi.session().then((session) => { setUser(session.user); setUsername(session.user?.displayName ?? ""); }).catch((reason: Error) => { setError(reason.message); setUser(null); }); }, []);

  async function run(action: () => Promise<void>) {
    setBusy(true); setError(null); setNotice(null);
    try { await action(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Something went wrong"); }
    finally { setBusy(false); }
  }

  async function downloadAccountExport() {
    const data = await accountApi.exportAccount();
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url; link.download = `fanofin-account-${new Date().toISOString().slice(0, 10)}.json`; link.click();
    URL.revokeObjectURL(url);
  }

  if (user === undefined) return <div className="mx-auto max-w-3xl px-4 py-10 text-ctp-subtext1">Loading your account…</div>;
  if (!user) return <div className="mx-auto max-w-xl px-4 py-12"><h1 className="text-2xl font-bold text-ctp-blue">Account</h1><p className="mt-2 text-ctp-subtext1">Sign in to manage your profile and account.</p><div className="mt-6"><GoogleSignInButton onCredential={(credential, nonce) => void run(async () => setUser((await accountApi.googleSignIn(credential, nonce)).user))} /></div>{error && <p className="mt-4 text-sm text-ctp-red">{error}</p>}</div>;

  return <PageLayout>
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold text-ctp-blue">Account</h1><p className="mt-1 text-sm text-ctp-subtext1">Profile, privacy, sessions, and your data.</p></div><Link to="/my-decks" className="rounded-md border border-ctp-blue px-3 py-1.5 text-sm text-ctp-blue">My Decks</Link></div>
    {error && <p className="mt-4 rounded-md border border-ctp-red/50 bg-ctp-red/10 p-3 text-sm text-ctp-red">{error}</p>}
    {notice && <p className="mt-4 rounded-md border border-ctp-green/50 bg-ctp-green/10 p-3 text-sm text-ctp-green">{notice}</p>}

    <section className="mt-8 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4">
      <h2 className="font-semibold text-ctp-text">Public profile</h2>
      <p className="mt-1 text-xs text-ctp-subtext1">Choose the name shown with your decks. It can be 2–32 characters.</p>
      <form className="mt-3 flex max-w-md gap-2" onSubmit={(event) => { event.preventDefault(); void run(async () => { const result = await accountApi.updateUsername(username); setUser(result.user); setUsername(result.user.displayName); setNotice("Display name updated."); }); }}>
        <label htmlFor="account-username" className="sr-only">Display name</label>
        <input id="account-username" autoComplete="nickname" minLength={2} maxLength={32} required value={username} onChange={(event) => setUsername(event.target.value)} className="min-w-0 flex-1 rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm" />
        <button disabled={busy || username.trim() === user.displayName} type="submit" className="rounded-md bg-ctp-blue px-3 py-2 text-sm text-ctp-base disabled:opacity-50">Save</button>
      </form>
      <label className="mt-4 flex max-w-xl items-start gap-3 text-sm text-ctp-subtext1"><input type="checkbox" checked={user.profileDiscoverable} disabled={busy} onChange={(event) => { const checked = event.target.checked; void run(async () => { const result = await accountApi.updateProfileDiscoverability(checked); setUser(result.user); setNotice(checked ? "Your public profile can appear in discovery." : "Your profile is hidden from discovery; shared deck links still work."); }); }} className="mt-0.5" /><span><span className="font-medium text-ctp-text">Show my public profile in discovery</span><br />Turn this off to hide your profile and public decks from browsing.</span></label>
      {user.profileDiscoverable && <Link to={`/users/${user.profileSlug}`} className="mt-3 inline-block text-sm text-ctp-blue hover:underline">View public profile</Link>}
    </section>

    <section className="mt-6 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4"><h2 className="font-semibold text-ctp-text">Sessions and data</h2><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void run(downloadAccountExport)} className="rounded-md border border-ctp-surface1 px-3 py-1.5 text-sm">Export my data</button><button type="button" disabled={busy} onClick={() => void run(async () => { await accountApi.logout(); setUser(null); })} className="rounded-md border border-ctp-surface1 px-3 py-1.5 text-sm">Sign out</button><button type="button" disabled={busy} onClick={() => void run(async () => { await accountApi.logoutAll(); setUser(null); })} className="rounded-md border border-ctp-surface1 px-3 py-1.5 text-sm">Sign out all devices</button></div></section>

    <section className="mt-6 rounded-xl border border-ctp-red/40 bg-ctp-red/5 p-4"><h2 className="font-semibold text-ctp-red">Delete account</h2><p className="mt-1 text-sm text-ctp-subtext1">Permanently remove your account, decks, collection, and social activity.</p><button type="button" disabled={busy} onClick={() => { if (window.prompt("Permanently delete your account, saved decks, and collection? Type DELETE to confirm.") === "DELETE") void run(async () => { await accountApi.deleteAccount(); setUser(null); }); }} className="mt-3 rounded-md border border-ctp-red/60 px-3 py-1.5 text-sm text-ctp-red">Delete account</button></section>
  </PageLayout>;
}
