import { useEffect, useRef } from "react";
import Button from "../../components/ui/Button";

const HOLD_MS = 600;
const DOUBLE_TAP_MS = 300;

export default function LifeIncrementButton({ player, onAdjust }: { player: number; onAdjust: (amount: number) => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const activePointer = useRef<number | null>(null);

  function clearHold() {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }
  function cancel() {
    clearHold();
    if (activePointer.current !== null) {
      suppressClick.current = true;
      lastTap.current = null;
    }
    activePointer.current = null;
  }
  useEffect(() => () => { if (timer.current !== null) clearTimeout(timer.current); }, []);

  return <Button
    className={`min-h-20! text-3xl! select-none touch-manipulation border-transparent! text-ctp-crust! hover:opacity-90 active:opacity-80 ${player === 1 ? "bg-ctp-blue" : "bg-ctp-peach"}`}
    variant="secondary"
    aria-label={`Add life to Player ${player}`}
    aria-describedby={`life-plus-help-${player}`}
    onPointerDown={event => {
      if (!event.isPrimary || event.button !== 0) return;
      clearHold();
      suppressClick.current = false;
      activePointer.current = event.pointerId;
      timer.current = setTimeout(() => {
        timer.current = null;
        lastTap.current = null;
        suppressClick.current = true;
        onAdjust(10);
      }, HOLD_MS);
    }}
    onPointerUp={event => {
      if (event.pointerId !== activePointer.current) return;
      clearHold();
      activePointer.current = null;
    }}
    onPointerLeave={cancel}
    onPointerCancel={cancel}
    onBlur={cancel}
    onContextMenu={event => event.preventDefault()}
    onClick={event => {
      // Keyboard and assistive activation remain immediate single increments.
      if (event.detail === 0) {
        lastTap.current = null;
        onAdjust(1);
        return;
      }
      if (suppressClick.current) return;
      const now = performance.now();
      if (lastTap.current !== null && now - lastTap.current <= DOUBLE_TAP_MS) {
        lastTap.current = null;
        // The first tap already added one: the pair must total five.
        onAdjust(4);
      } else {
        lastTap.current = now;
        onAdjust(1);
      }
    }}
  >
    +
  </Button>;
}
