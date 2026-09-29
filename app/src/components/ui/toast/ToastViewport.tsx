import { useContext, useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ToastContext } from "./ToastContext";
import type { Toast } from "./toastState";
const colors = { success: "border-ctp-green text-ctp-green", info: "border-ctp-blue text-ctp-blue", warning: "border-ctp-yellow text-ctp-yellow", error: "border-ctp-red text-ctp-red" };
const labels = { success: "Success", info: "Info", warning: "Warning", error: "Error" };
const control = "inline-flex min-h-12 min-w-12 items-center justify-center rounded-lg px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue";
function ToastMessage({ toast, dismiss, waiting }: { toast: Toast; dismiss: (id: string) => void; waiting: number }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const remaining = useRef(toast.duration);
  const returnFocus = useRef(document.activeElement);
  const root = useRef<HTMLDivElement>(null);
  function close() {
    if (root.current?.contains(document.activeElement) && returnFocus.current instanceof HTMLElement && returnFocus.current.isConnected) returnFocus.current.focus({ preventScroll: true });
    dismiss(toast.id);
  }
  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  useEffect(() => {
    if (remaining.current === null || hovered || focused || hidden || busy || failure) return;
    const start = Date.now();
    const timer = window.setTimeout(() => dismiss(toast.id), remaining.current);
    return () => { clearTimeout(timer); if (remaining.current !== null) remaining.current = Math.max(0, remaining.current - (Date.now() - start)); };
  }, [hovered, focused, hidden, busy, failure, toast.id, dismiss]);
  async function act() {
    if (!toast.action || !("onClick" in toast.action) || busy) return;
    setBusy(true); setFailure("");
    try { await toast.action.onClick(); dismiss(toast.id); }
    catch (error) { setFailure(error instanceof Error ? error.message : "Action failed. Please try again."); }
    finally { setBusy(false); }
  }
  return <div ref={root} data-component="Toast" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }} className={`flex min-w-0 flex-wrap items-center gap-x-2 rounded-xl border bg-ctp-mantle p-2 shadow-lg ${colors[toast.tone]}`}>
    <div className="min-w-0 flex-1 basis-48 px-1 text-sm"><span className="font-semibold">{labels[toast.tone]}: </span><span className="break-words text-ctp-text">{toast.message}</span>{waiting > 0 && <span className="block text-xs text-ctp-subtext1">{waiting} more notification{waiting === 1 ? "" : "s"}</span>}</div>
    {toast.action && ("to" in toast.action ? <Link to={toast.action.to} onClick={() => dismiss(toast.id)} className={control}>{toast.action.label}</Link> : <button type="button" disabled={busy} onClick={() => void act()} className={control}>{busy ? "Working…" : toast.action.label}</button>)}
    <button type="button" disabled={busy} aria-label="Dismiss notification" onClick={close} className={`${control} text-ctp-subtext1`}><span aria-hidden="true">×</span></button>
    {failure && <p role="alert" className="w-full break-words px-1 text-sm text-ctp-red">{failure}</p>}
  </div>;
}
/** Inline in sticky app headers or dialog chrome: reserves space, never covers content/footer. */
export default function ToastViewport({ dialog = false }: { dialog?: boolean }) {
  const context = useContext(ToastContext);
  const id = useId();
  const register = context?.register;
  useEffect(() => dialog ? register?.(id) : undefined, [dialog, register, id]);
  if (!context || context.host !== (dialog ? id : "app")) return null;
  const toast = context.queue[0];
  return <div aria-label="Notifications" className={toast ? "mx-auto w-full max-w-5xl shrink-0 px-3 py-2" : ""}>
    <span className="sr-only" role="status" aria-atomic="true">{toast && toast.tone !== "error" ? `${labels[toast.tone]}: ${toast.message}` : ""}</span>
    <span className="sr-only" role="alert" aria-atomic="true">{toast?.tone === "error" ? `Error: ${toast.message}` : ""}</span>
    {toast && <ToastMessage key={toast.id} toast={toast} dismiss={context.dismiss} waiting={context.queue.length - 1} />}
  </div>;
}
