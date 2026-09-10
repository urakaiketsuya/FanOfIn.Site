import { useEffect, useState } from "react";
import type { AccountUser, AuthIdentity, AuthProvider } from "@gatcg/shared";
import { Link, useSearchParams } from "react-router-dom";
import { accountApi } from "../../lib/accountApi";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import GoogleSignInButton from "./GoogleSignInButton";
import DiscordSignInButton from "./DiscordSignInButton";
import PasswordSignInPanel from "./PasswordSignInPanel";
import PasswordChangePanel from "./PasswordChangePanel";
import PageLayout from "../../components/layout/PageLayout";
import Panel from "../../components/ui/Panel";
import Button from "../../components/ui/Button";
import { InlineState } from "../../components/ui/ContentState";

export default function AccountIndex() {
  useDocumentTitle("Account", "Manage your Fan of Insight account and public profile.");
  const [user, setUser] = useState<AccountUser | null>();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [identities, setIdentities] = useState<AuthIdentity[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const authResult = searchParams.get("auth");
    const messages: Record<string, { notice?: string; error?: string }> = {
      "discord-linked": { notice: "Discord is now connected to your account." },
      "discord-signed-in": { notice: "Signed in with Discord." },
      "discord-cancelled": { error: "Discord sign-in was cancelled." },
      "discord-state-invalid": { error: "Discord sign-in expired. Please try again." },
      "discord-link-session-expired": { error: "Your session changed before Discord could be linked. Please try again." },
      "discord-failed": { error: "Discord sign-in failed. Please try again." },
    };
    if (authResult && messages[authResult]) {
      setNotice(messages[authResult].notice ?? null);
      setError(messages[authResult].error ?? null);
      setSearchParams({}, { replace: true });
    }
    void accountApi.session().then(async (session) => {
      setUser(session.user); setUsername(session.user?.displayName ?? "");
      if (session.user) setIdentities((await accountApi.authIdentities()).identities);
    }).catch((reason: Error) => { setError(reason.message); setUser(null); });
  }, [searchParams, setSearchParams]);

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

  if (user === undefined) return <PageLayout data-component="AccountIndex"><InlineState className="mt-10">Loading your account…</InlineState></PageLayout>;
  if (!user) return <PageLayout data-component="AccountIndex" width="standard"><h1 className="text-2xl font-bold text-ctp-blue">Account</h1><p className="mt-2 text-ctp-subtext1">Sign in to manage your profile and account.</p><div className="mt-6 flex flex-wrap items-center gap-3"><GoogleSignInButton onCredential={(credential, nonce) => void run(async () => { setUser((await accountApi.googleSignIn(credential, nonce)).user); setIdentities((await accountApi.authIdentities()).identities); })} /><DiscordSignInButton /><PasswordSignInPanel onSignedIn={(signedInUser) => { setUser(signedInUser); void accountApi.authIdentities().then((result) => setIdentities(result.identities)); }} /></div>{error && <InlineState tone="danger" className="mt-4 text-sm">{error}</InlineState>}</PageLayout>;

  return <PageLayout data-component="AccountIndex">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold text-ctp-blue">Account</h1><p className="mt-1 text-sm text-ctp-subtext1">Profile, privacy, sessions, and your data.</p></div><Link to="/decks/edit" className="rounded-md border border-ctp-blue px-3 py-1.5 text-sm text-ctp-blue">My Decks</Link></div>
    {error && <Panel tone="danger" padding="sm" className="mt-4 text-sm text-ctp-red">{error}</Panel>}
    {notice && <Panel tone="success" padding="sm" className="mt-4 text-sm text-ctp-green">{notice}</Panel>}

    <Panel className="mt-8">
      <h2 className="font-semibold text-ctp-text">Public profile</h2>
      <p className="mt-1 text-xs text-ctp-subtext1">Choose the name shown with your decks. It can be 2–32 characters.</p>
      <form className="mt-3 flex max-w-md gap-2" onSubmit={(event) => { event.preventDefault(); void run(async () => { const result = await accountApi.updateUsername(username); setUser(result.user); setUsername(result.user.displayName); setNotice("Display name updated."); }); }}>
        <label htmlFor="account-username" className="sr-only">Display name</label>
        <input id="account-username" autoComplete="nickname" minLength={2} maxLength={32} required value={username} onChange={(event) => setUsername(event.target.value)} className="min-w-0 flex-1 rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm" />
        <Button variant="primary" disabled={busy || username.trim() === user.displayName} type="submit">Save</Button>
      </form>
      <label className="mt-4 flex max-w-xl items-start gap-3 text-sm text-ctp-subtext1"><input type="checkbox" checked={user.profileDiscoverable} disabled={busy} onChange={(event) => { const checked = event.target.checked; void run(async () => { const result = await accountApi.updateProfileDiscoverability(checked); setUser(result.user); setNotice(checked ? "Your public profile can appear in discovery." : "Your profile is hidden from discovery; shared deck links still work."); }); }} className="mt-0.5" /><span><span className="font-medium text-ctp-text">Show my public profile in discovery</span><br />Turn this off to hide your profile and public decks from browsing.</span></label>
      {user.profileDiscoverable && <Link to={`/users/${user.profileSlug}`} className="mt-3 inline-block text-sm text-ctp-blue hover:underline">View public profile</Link>}
    </Panel>

    <Panel className="mt-6">
      <h2 className="font-semibold text-ctp-text">Sign-in methods</h2>
      <p className="mt-1 text-xs text-ctp-subtext1">Connect more than one method so you can still reach your decks if one provider is unavailable.</p>
      <div className="mt-4 space-y-3">
        {(["google", "discord", "password"] as AuthProvider[]).map((provider) => {
          const identity = identities.find((item) => item.provider === provider);
          const label = provider === "google" ? "Google" : provider === "discord" ? "Discord" : "Email and password";
          return <div key={provider} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-ctp-surface1 bg-ctp-base px-4 py-3">
            <div><p className="text-sm font-medium text-ctp-text">{label}</p><p className="text-xs text-ctp-subtext1">{identity ? identity.email : "Not connected"}</p></div>
            {identity
              ? <div className="flex flex-wrap items-start gap-2">{provider === "password" && <PasswordChangePanel />}<Button variant="secondary" disabled={busy || identities.length <= 1} title={identities.length <= 1 ? "Connect another method before removing this one" : undefined} onClick={() => void run(async () => { await accountApi.removeAuthIdentity(provider); setIdentities((await accountApi.authIdentities()).identities); setNotice(`${label} disconnected.`); })}>Disconnect</Button></div>
              : provider === "discord"
                ? <DiscordSignInButton purpose="link" disabled={busy} />
                : provider === "password"
                  ? <PasswordSignInPanel link />
                : <GoogleSignInButton onCredential={(credential, nonce) => void run(async () => { const result = await accountApi.googleSignIn(credential, nonce); setUser(result.user); setIdentities((await accountApi.authIdentities()).identities); setNotice("Google is now connected to your account."); })} />}
          </div>;
        })}
      </div>
      {identities.length <= 1 && <p className="mt-3 text-xs text-ctp-subtext0">Your only sign-in method cannot be disconnected.</p>}
    </Panel>

    <Panel className="mt-6"><h2 className="font-semibold text-ctp-text">Sessions and data</h2><div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" disabled={busy} onClick={() => void run(downloadAccountExport)}>Export my data</Button><Button variant="secondary" disabled={busy} onClick={() => void run(async () => { await accountApi.logout(); setUser(null); })}>Sign out</Button><Button variant="secondary" disabled={busy} onClick={() => void run(async () => { await accountApi.logoutAll(); setUser(null); })}>Sign out all devices</Button></div></Panel>

    <Panel tone="danger" className="mt-6"><h2 className="font-semibold text-ctp-red">Delete account</h2><p className="mt-1 text-sm text-ctp-subtext1">Permanently remove your account, decks, collection, and social activity.</p><Button variant="danger" disabled={busy} onClick={() => { if (window.prompt("Permanently delete your account, saved decks, and collection? Type DELETE to confirm.") === "DELETE") void run(async () => { await accountApi.deleteAccount(); setUser(null); }); }} className="mt-3">Delete account</Button></Panel>
  </PageLayout>;
}
