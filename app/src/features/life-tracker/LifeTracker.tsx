import { useState } from "react";
import LifeIncrementButton from "./LifeIncrementButton";
import PageLayout from "../../components/layout/PageLayout";
import Button from "../../components/ui/Button";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

export default function LifeTracker() {
  useDocumentTitle("Life Tracker", "A simple life tracker for two players.");
  const [totals, setTotals] = useState([0, 0]);
  function adjust(player: number, delta: number) {
    setTotals(current => current.map((total, index) => index === player ? Math.max(0, total + delta) : total));
  }
  return <PageLayout width="fluid" data-component="LifeTracker">
    <h1 className="mb-4 text-2xl font-bold text-ctp-text">Life Tracker</h1>
    <div className="mx-auto grid max-w-3xl gap-4">
      {totals.map((total, index) => <section key={index} aria-labelledby={`life-player-${index}`} className={`rounded-2xl border-2 p-5 sm:p-8 ${index === 0 ? "rotate-180 border-ctp-blue bg-ctp-blue/20" : "border-ctp-peach bg-ctp-peach/20"}`}>
        <h2 id={`life-player-${index}`} className={`inline-flex min-h-12 items-center rounded-full px-5 text-xl font-bold text-ctp-crust ${index === 0 ? "bg-ctp-blue" : "bg-ctp-peach"}`}>Player {index + 1}</h2>
        <output aria-label={`Player ${index + 1} life`} aria-live="polite" aria-atomic="true" className={`my-5 block text-center text-7xl font-bold tabular-nums sm:text-8xl ${index === 0 ? "text-ctp-blue" : "text-ctp-peach"}`}>{total}</output>
        <div className="grid grid-cols-2 gap-4">
          <Button className="min-h-20! text-3xl! touch-manipulation" aria-label={`Subtract 1 life from Player ${index + 1}`} disabled={total === 0} onClick={() => adjust(index, -1)}>−</Button>
          <LifeIncrementButton player={index + 1} onAdjust={amount => adjust(index, amount)} />
        </div>
        <p id={`life-plus-help-${index + 1}`} className="mt-3 text-center text-xs text-ctp-subtext1">Plus: tap +1 · Double-tap +5 · Hold +10</p>
      </section>)}
    </div>
  </PageLayout>;
}
