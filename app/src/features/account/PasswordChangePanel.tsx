import { useState } from "react";
import { accountApi } from "../../lib/accountApi";
import Button from "../../components/ui/Button";
import { InlineState } from "../../components/ui/ContentState";

export default function PasswordChangePanel() {
  const [open, setOpen] = useState(false); const [current, setCurrent] = useState(""); const [next, setNext] = useState(""); const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState<string | null>(null); const [error, setError] = useState<string | null>(null);
  if (!open) return <Button variant="secondary" type="button" onClick={() => setOpen(true)}>Change password</Button>;
  return <form className="w-full max-w-sm space-y-2" onSubmit={(event) => { event.preventDefault(); setError(null); setMessage(null); if (next !== confirm) { setError("Passwords do not match"); return; } setBusy(true); void accountApi.changePassword(current, next).then(() => { setMessage("Password changed; other sessions were signed out."); setCurrent(""); setNext(""); setConfirm(""); }, (reason: Error) => setError(reason.message)).finally(() => setBusy(false)); }}>
    <input aria-label="Current password" placeholder="Current password" required autoComplete="current-password" type="password" value={current} onChange={(event) => setCurrent(event.target.value)} className="w-full rounded border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm" />
    <input aria-label="New password" placeholder="New password (15+ characters)" required minLength={15} maxLength={128} autoComplete="new-password" type="password" value={next} onChange={(event) => setNext(event.target.value)} className="w-full rounded border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm" />
    <input aria-label="Confirm new password" placeholder="Confirm new password" required minLength={15} maxLength={128} autoComplete="new-password" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} className="w-full rounded border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm" />
    <div className="flex gap-2"><Button disabled={busy} variant="primary" type="submit">{busy ? "Changing…" : "Change password"}</Button><Button variant="secondary" type="button" onClick={() => setOpen(false)}>Cancel</Button></div>
    {message && <InlineState className="text-xs text-ctp-green">{message}</InlineState>}{error && <InlineState tone="danger" className="text-xs">{error}</InlineState>}
  </form>;
}
