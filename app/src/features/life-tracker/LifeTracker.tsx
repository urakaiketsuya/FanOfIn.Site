import { useState } from "react";
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
      {totals.map((total, index) => <section key={index} aria-labelledby={`life-player-${index}`} className={`rounded-2xl border p-5 sm:p-8 ${index === 0 ? "rotate-180 border-ctp-blue/40 bg-ctp-blue/10" : "border-ctp-mauve/40 bg-ctp-mauve/10"}`}>
        <h2 id={`life-player-${index}`} className="text-xl font-semibold text-ctp-text">Player {index + 1}</h2>
        <output aria-label={`Player ${index + 1} life`} aria-live="polite" aria-atomic="true" className="my-5 block text-center text-7xl font-bold tabular-nums text-ctp-text sm:text-8xl">{total}</output>
        <div className="grid grid-cols-2 gap-4">
          <Button className="min-h-20! text-3xl! touch-manipulation" aria-label={`Subtract 1 life from Player ${index + 1}`} disabled={total === 0} onClick={() => adjust(index, -1)}>−</Button>
          <Button className="min-h-20! text-3xl! touch-manipulation" variant="primary" aria-label={`Add 1 life to Player ${index + 1}`} onClick={() => adjust(index, 1)}>+</Button>
        </div>
      </section>)}
    </div>
  </PageLayout>;
}
