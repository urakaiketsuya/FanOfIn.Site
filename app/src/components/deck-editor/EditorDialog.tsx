import { useEffect, useId, useRef, type ReactNode } from "react";

export default function EditorDialog({ count, onDismiss, children, title = "Add cards", doneLabel, dismissible = true }: {
  dismissible?: boolean;
  count?: number;
  title?: string;
  doneLabel?: string;
  onDismiss: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={ref} aria-labelledby={titleId} onClose={onDismiss} onCancel={event=>{if(!dismissible) event.preventDefault();}}
    onClick={(event) => { if (dismissible && event.target === event.currentTarget) onDismiss(); }}
    className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-dvh w-full max-w-none border-0 bg-ctp-base p-0 text-ctp-text backdrop:bg-black/60 sm:max-w-xl sm:border-l sm:border-ctp-surface1">
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-ctp-surface1 bg-ctp-mantle p-3">
        <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
        <button type="button" disabled={!dismissible} autoFocus onClick={onDismiss} className="min-h-12 rounded-lg bg-ctp-blue px-3 py-2 text-sm font-medium text-ctp-base">{doneLabel ?? `Done · View deck (${count ?? 0})`}</button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{children}</div>
    </div>
  </dialog>;
}
