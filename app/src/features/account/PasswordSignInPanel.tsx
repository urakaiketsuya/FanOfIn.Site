import { useCallback, useState } from "react";
import type { AccountUser } from "@gatcg/shared";
import { accountApi } from "../../lib/accountApi";
import Button from "../../components/ui/Button";
import { InlineState } from "../../components/ui/ContentState";
import TurnstileWidget from "./TurnstileWidget";

type Mode = "login" | "register" | "forgot";

export default function PasswordSignInPanel({ link = false, onSignedIn }: { link?: boolean; onSignedIn?(user: AccountUser): void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(link ? "register" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onToken = useCallback((token: string) => setTurnstileToken(token), []);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(null); setMessage(null);
    try {
      if (mode === "forgot") setMessage((await accountApi.forgotPassword(email, turnstileToken)).message);
      else if (mode === "register") {
        if (password !== confirm) throw new Error("Passwords do not match");
        setMessage((await accountApi.passwordRegister(email, password, turnstileToken)).message);
      } else {
        const result = await accountApi.passwordLogin(email, password, turnstileToken);
        if (result.user) onSignedIn?.(result.user);
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Authentication failed"); }
    finally { setBusy(false); }
  }

  if (!open) return <Button type="button" variant="secondary" onClick={() => setOpen(true)}>{link ? "Add email and password" : "Continue with email"}</Button>;
  return <div data-component="PasswordSignInPanel" className="w-full max-w-md rounded-md border border-ctp-surface1 bg-ctp-base p-4 text-left">
    {!link && <div className="mb-4 flex gap-2 text-sm">
      {(["login", "register", "forgot"] as Mode[]).map((item) => <button key={item} type="button" onClick={() => { setMode(item); setError(null); setMessage(null); }} className={mode === item ? "text-ctp-blue underline" : "text-ctp-subtext1 hover:text-ctp-text"}>{item === "login" ? "Sign in" : item === "register" ? "Register" : "Forgot password"}</button>)}
    </div>}
    <form onSubmit={(event) => void submit(event)} className="space-y-3">
      <label className="block text-sm text-ctp-subtext1">Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-ctp-text" /></label>
      {mode !== "forgot" && <label className="block text-sm text-ctp-subtext1">Password<input required minLength={15} maxLength={128} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-ctp-text" /></label>}
      {mode === "register" && <label className="block text-sm text-ctp-subtext1">Confirm password<input required minLength={15} maxLength={128} type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-ctp-text" /></label>}
      {mode === "register" && <p className="text-xs text-ctp-subtext0">Use at least 15 characters. Spaces and Unicode are allowed.</p>}
      <TurnstileWidget onToken={onToken} />
      <Button type="submit" variant="primary" disabled={busy || !turnstileToken}>{busy ? "Please wait…" : link ? "Add email and password" : mode === "login" ? "Sign in" : mode === "register" ? "Create account" : "Send reset link"}</Button>
    </form>
    {message && <InlineState className="mt-3 text-sm text-ctp-green">{message}</InlineState>}
    {error && <InlineState tone="danger" className="mt-3 text-sm">{error}</InlineState>}
  </div>;
}
