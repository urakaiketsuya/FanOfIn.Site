import { useEffect, useRef, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

/** Action menu disclosure. Keep children mounted so launched dialogs retain their state. */
export default function MenuDetails({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pointerInteraction = useRef(false);
  const location = useLocation();
  function close(restoreFocus = false) {
    const menu = ref.current;
    if (!menu?.open) return;
    if (restoreFocus) menu.querySelector("summary")?.focus({ preventScroll: true });
    menu.open = false;
  }
  useEffect(() => { close(); }, [location.key]);
  useEffect(() => {
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !ref.current?.contains(event.target)) close();
    }
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, []);
  return <details ref={ref} name="site-action-menu" data-action-menu className={className}
    onPointerDownCapture={() => { pointerInteraction.current = true; }}
    onBlur={event => {
      // Mobile browsers can move focus outside (or clear it) before delivering
      // a tap's click. Pointer dismissal belongs to outside-pointerdown/click;
      // only keyboard focus changes should dismiss via blur.
      if (!pointerInteraction.current && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) close();
    }}
    onKeyDown={event => {
      pointerInteraction.current = false;
      if ((event.target as Element).closest("dialog")) return;
      if (event.key === "Escape" && event.currentTarget.open) {
        event.preventDefault(); event.stopPropagation(); close(true);
      }
    }}
    onClickCapture={event => {
      const target = event.target as Element;
      if (target.closest("dialog")) return;
      if (target.closest("summary")) {
        // Also covers browsers without native exclusive-details support.
        document.querySelectorAll<HTMLDetailsElement>("details[data-action-menu][open]").forEach(menu => {
          if (menu !== ref.current) menu.open = false;
        });
      }
    }}
    onClick={event => {
      const target = event.target as Element;
      if (target.closest("dialog, summary")) return;
      // Let the child action run first, then focus the persistent trigger before
      // React mounts a requested dialog and captures its return-focus target.
      if (target.closest("button:not(:disabled), a[href]")) close(true);
    }}
    onChange={event => { if (!(event.target as Element).closest("dialog")) close(true); }}
  >{children}</details>;
}
