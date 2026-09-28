import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Button from "./Button";

/** Native modal isolation, focus restoration and explicit draft dismissal for all sheets. */
export default function DialogSheet({ title, children, onDismiss, dismissLabel = "Close", dismissible = true, dirty = false, footer }: {
  title: string; children: ReactNode; onDismiss: () => void; dismissLabel?: string;
  dismissible?: boolean; dirty?: boolean; footer?: ReactNode;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef(document.activeElement);
  const keepEditing = useRef<HTMLButtonElement>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = returnFocus.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      document.body.style.overflow = previousOverflow;
      queueMicrotask(() => { if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true }); });
    };
  }, []);
  useEffect(() => {
    if (confirmDiscard) keepEditing.current?.focus();
    else if (!ref.current?.contains(document.activeElement)) ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [confirmDiscard]);
  function dismiss() {
    if (!dismissible) return;
    if (confirmDiscard) { setConfirmDiscard(false); return; }
    if (dirty) setConfirmDiscard(true);
    else onDismiss();
  }
  return <dialog ref={ref} aria-labelledby={titleId} onKeyDown={event => {
      if (event.key !== "Tab" || (event.target as Element).closest("dialog") !== ref.current) return;
      const items = [...(ref.current?.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, summary, [tabindex]') ?? [])]
        .filter(item => item.tabIndex >= 0 && !item.matches(":disabled") && item.getClientRects().length > 0);
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }} onCancel={event => { event.preventDefault(); event.stopPropagation(); dismiss(); }}
    onClick={event => { if (event.target === event.currentTarget) dismiss(); }}
    className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-dvh w-full max-w-none border-0 bg-ctp-base p-0 text-ctp-text backdrop:bg-black/60 sm:max-w-xl sm:border-l sm:border-ctp-surface1">
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-ctp-surface1 bg-ctp-mantle p-3">
        <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
        <Button disabled={!dismissible} onClick={dismiss}>{dismissLabel}</Button>
      </header>
      {confirmDiscard ? <div className="space-y-4 p-4" role="alert">
        <p>Discard your unsaved changes?</p>
        <div className="flex flex-wrap gap-2">
          <button ref={keepEditing} type="button" onClick={() => setConfirmDiscard(false)} className="min-h-12 rounded-lg bg-ctp-blue px-4 text-ctp-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">Keep editing</button>
          <Button variant="danger" onClick={onDismiss}>Discard changes</Button>
        </div>
      </div> : null}
      <div hidden={confirmDiscard} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{children}</div>
      {footer && !confirmDiscard && <footer className="shrink-0 border-t border-ctp-surface1 bg-ctp-base p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</footer>}
    </div>
  </dialog>;
}
