import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { accountApi } from "../../lib/accountApi";
import PageLayout from "../../components/layout/PageLayout";
import Panel from "../../components/ui/Panel";
import Button from "../../components/ui/Button";
import { InlineState } from "../../components/ui/ContentState";
import TurnstileWidget from "./TurnstileWidget";

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const [state, setState] = useState("Verifying your email…");
  useEffect(() => { const token = new URLSearchParams(window.location.hash.slice(1)).get("token"); window.history.replaceState(null, "", window.location.pathname); if (!token) { setState("Verification link is missing its token."); return; }
    void accountApi.verifyEmail(token).then((result) => { setState(result.user ? "Email verified. Redirecting…" : "Email verified. Sign in with your email and password."); setTimeout(() => navigate("/account", { replace: true }), 1200); }).catch((reason: Error) => setState(reason.message)); }, [navigate]);
  return <PageLayout width="standard"><Panel className="mt-8"><h1 className="text-xl font-semibold text-ctp-text">Verify email</h1><InlineState className="mt-3">{state}</InlineState></Panel></PageLayout>;
}

export function ResetPasswordPage() {
  const [token] = useState(() => { const value = new URLSearchParams(window.location.hash.slice(1)).get("token") ?? ""; window.history.replaceState(null, "", window.location.pathname); return value; });
  const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [humanToken, setHumanToken] = useState("");
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState<string | null>(null); const [error, setError] = useState<string | null>(null);
  const onToken = useCallback((value: string) => setHumanToken(value), []);
  return <PageLayout width="standard"><Panel className="mt-8"><h1 className="text-xl font-semibold text-ctp-text">Reset password</h1>
    <form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); setError(null); if (password !== confirm) { setError("Passwords do not match"); return; } setBusy(true); void accountApi.resetPassword(token, password, humanToken).then(() => setMessage("Password changed. All existing sessions were signed out."), (reason: Error) => setError(reason.message)).finally(() => setBusy(false)); }}>
      <label className="block text-sm">New password<input required minLength={15} maxLength={128} autoComplete="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2" /></label>
      <label className="block text-sm">Confirm password<input required minLength={15} maxLength={128} autoComplete="new-password" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2" /></label>
      <TurnstileWidget onToken={onToken} /><Button type="submit" variant="primary" disabled={busy || !token || !humanToken}>{busy ? "Changing…" : "Change password"}</Button>
    </form>{message && <InlineState className="mt-3 text-ctp-green">{message} <Link className="underline" to="/account">Sign in</Link></InlineState>}{error && <InlineState tone="danger" className="mt-3">{error}</InlineState>}
  </Panel></PageLayout>;
}
