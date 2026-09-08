import type { DelugeForecast, ScavengeForecast } from "../lib/keywordForecast";

function titleCase(word: string): string {
  return word[0] + word.slice(1).toLowerCase();
}

export function ScavengeForecastList({ forecasts }: { forecasts: ScavengeForecast[] }) {
  if (forecasts.length === 0) return null;
  return (
    <div data-component="ScavengeForecastList" className="space-y-2">
      {forecasts.map((f) => (
        <div key={`${f.cardName}:${f.amount}:${f.targetLabel}`} className="rounded-lg border border-ctp-surface1 p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">{f.cardName} — Scavenge {f.amount}</h4>
          <p className="mt-2 text-2xl font-semibold text-ctp-text">
            {Math.round(f.hitChance * 100)}% <span className="text-sm font-normal text-ctp-subtext0">chance to hit {f.targetLabel}</span>
          </p>
          <p className="mt-1 text-xs text-ctp-subtext1">
            {f.matchingCopies} matching card{f.matchingCopies === 1 ? "" : "s"} in a {f.deckSize}-card deck{f.copies > 1 ? ` · ${f.copies} copies run` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

export function DelugeForecastList({ forecasts }: { forecasts: DelugeForecast[] }) {
  if (forecasts.length === 0) return null;
  return (
    <div data-component="DelugeForecastList" className="space-y-2">
      {forecasts.map((f) => {
        const headline = f.points.find((p) => p.seen === 15) ?? f.points[f.points.length - 1];
        return (
          <div key={f.cardName} className="rounded-lg border border-ctp-surface1 p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">{f.cardName} — Deluge {f.threshold}</h4>
            <p className="mt-2 text-2xl font-semibold text-ctp-text">
              {headline.expected.toFixed(1)} <span className="text-sm font-normal text-ctp-subtext0">{titleCase(f.element)} cards expected in your graveyard by {headline.seen} seen — needs {f.threshold}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ctp-subtext1">
              {f.points.map((p) => <span key={p.seen}>{p.seen} seen: {p.expected.toFixed(1)}</span>)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
