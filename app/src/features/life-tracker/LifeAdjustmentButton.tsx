import { useEffect, useRef } from "react";
import Button from "../../components/ui/Button";

const HOLD_MS = 600;
const DOUBLE_TAP_MS = 300;

export default function LifeAdjustmentButton({ player, direction, disabled, onAdjust }: { player: number; direction: 1 | -1; disabled?: boolean; onAdjust: (amount: number) => void }) {
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
    className={`min-h-20! text-3xl! select-none touch-manipulation border-2! ${direction === 1 ? `border-transparent! text-ctp-crust! hover:opacity-90 active:opacity-80 ${player === 1 ? "bg-ctp-blue" : "bg-ctp-peach"}` : `bg-ctp-base/40 disabled:opacity-70 ${player === 1 ? "border-ctp-blue! text-ctp-blue!" : "border-ctp-peach! text-ctp-peach!"}`}`}
    variant="secondary"
    disabled={disabled}
    aria-label={`${direction === 1 ? "Add life to" : "Subtract life from"} Player ${player}`}
    aria-describedby={`life-adjust-help-${player}`}
    onPointerDown={event => {
      if (disabled || !event.isPrimary || event.button !== 0) return;
      clearHold();
      suppressClick.current = false;
      activePointer.current = event.pointerId;
      timer.current = setTimeout(() => {
        timer.current = null;
        lastTap.current = null;
        suppressClick.current = true;
        onAdjust(10 * direction);
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
      // Keyboard and assistive activation remain immediate single adjustments.
      if (event.detail === 0) {
        lastTap.current = null;
        onAdjust(direction);
        return;
      }
      if (suppressClick.current) return;
      const now = performance.now();
      if (lastTap.current !== null && now - lastTap.current <= DOUBLE_TAP_MS) {
        lastTap.current = null;
        // The first tap already adjusted one: the pair must total five.
        onAdjust(4 * direction);
      } else {
        lastTap.current = now;
        onAdjust(direction);
      }
    }}
  >
    {direction === 1 ? "+" : "−"}
  </Button>;
}
