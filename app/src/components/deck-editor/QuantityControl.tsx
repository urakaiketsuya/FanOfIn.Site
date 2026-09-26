import { useEffect, useState } from "react";

export default function QuantityControl({ name, quantity, onChange, max }: { name: string; quantity: number; onChange: (quantity: number) => void; max?: number }) {
  const [text, setText] = useState(String(quantity));
  useEffect(() => setText(String(quantity)), [quantity]);
  function commit() {
    const next = Number(text);
    if (Number.isSafeInteger(next) && next >= 1 && (max === undefined || next <= max)) onChange(next);
    else setText(String(quantity));
  }
  return <div className="grid grid-cols-[3rem_minmax(0,1fr)_3rem] rounded-lg border border-ctp-surface1 bg-ctp-base">
    <button type="button" disabled={quantity <= 1} onClick={() => onChange(quantity - 1)} aria-label={`Remove one copy of ${name}`} className="min-h-12 min-w-12 text-lg disabled:opacity-30">−</button>
    <input type="number" inputMode="numeric" min={1} max={max} value={text} aria-label={`Copies of ${name}`} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setText(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} className="min-h-12 min-w-0 w-full bg-transparent text-center text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ctp-blue" />
    <button type="button" disabled={max !== undefined && quantity >= max} onClick={() => onChange(quantity + 1)} aria-label={`Add one copy of ${name}`} className="min-h-12 min-w-12 text-lg disabled:opacity-30">+</button>
  </div>;
}
