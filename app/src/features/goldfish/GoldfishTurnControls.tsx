import { useEffect, useRef } from "react";
import type { GoldfishState } from "../../lib/goldfishSimulator";
import Button from "../../components/ui/Button";

export default function GoldfishTurnControls({ state, blocked, onDraw, onNextTurn, onMemory, onMaterial, onTools, onHeight }: {
  state: GoldfishState; blocked: boolean; onDraw: () => void; onNextTurn: () => void;
  onMemory: () => void; onMaterial: () => void; onTools: () => void; onHeight: (height: number) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const page = document.documentElement;
    const previousPadding = page.style.scrollPaddingBottom;
    const observer = new ResizeObserver(() => {
      const height = element.getBoundingClientRect().height;
      onHeight(height);
      page.style.scrollPaddingBottom = `${height + 24}px`;
    });
    observer.observe(element);
    return () => { observer.disconnect(); page.style.scrollPaddingBottom = previousPadding; };
  }, [onHeight]);
  const lastAction = state.history.at(-1);
  return <div ref={root} role="region" aria-label="Turn controls" className="fixed inset-x-0 bottom-0 z-30 border-t border-ctp-surface1 bg-ctp-base p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg">
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="flex items-baseline gap-2"><span className="text-lg font-semibold tabular-nums text-ctp-text">Turn {state.turn}</span><span className="text-sm text-ctp-subtext1">{state.phase === "main" ? "Main phase" : "Recollection"}</span></p>
        <p className="text-xs tabular-nums text-ctp-subtext0">{state.hand.length} in hand · {state.library.length} in library</p>
      </div>
      <p role="status" aria-atomic="true" className="my-2 rounded-lg bg-ctp-mantle px-3 py-2 break-words text-xs text-ctp-subtext1"><span className="font-semibold text-ctp-text">Latest action: </span><span key={lastAction?.id} className="state-arrive">{lastAction?.label ?? "Ready to play"}</span></p>
      <div className="grid grid-cols-3 gap-2"><Button variant="primary" disabled={!state.library.length || blocked} onClick={onDraw}>Draw</Button><Button disabled={blocked} onClick={onNextTurn}>Next turn + draw</Button><Button onClick={onTools}>Tools</Button></div>
      <div className="mt-1 grid grid-cols-2 gap-2"><Button variant="ghost" onClick={onMemory}>Memory · {state.memory.length}</Button><Button variant="ghost" onClick={onMaterial}>Material · {state.materialDeck.length}</Button></div>
    </div>
  </div>;
}
