import type { ReactNode } from "react";
import type { DeckRating, RatingPillar } from "@gatcg/shared";

const PILLARS: RatingPillar[] = ["durability", "interaction", "aggro", "opportunity"];

/** The four-pillar DIAO score panel — shared by DeckDetail.tsx's own tab and DecklistView.tsx's
 * optional "DIAO score" section, so the two never drift into separate renderings of the same
 * `computeDeckRating` output. `children` is for DeckDetail.tsx's AggressionForecast, which only
 * that page has the extra data for. */
export default function DiaoScoreCard({ rating, children }: { rating: DeckRating; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">DIAO Score</h2>
        <span className="text-2xl font-bold text-ctp-blue">{rating.composite.toFixed(2)}</span>
      </div>
      <div className="mt-3 space-y-2">
        {PILLARS.map((pillar) => (
          <div key={pillar} className="flex items-center gap-2 text-sm">
            <span className="w-24 shrink-0 capitalize text-ctp-subtext1">{pillar}</span>
            <div className="h-2 flex-1 rounded-full bg-ctp-surface0">
              <div className="h-2 rounded-full bg-ctp-blue" style={{ width: `${(rating.scores[pillar] / 10) * 100}%` }} />
            </div>
            <span className="w-6 shrink-0 text-right text-ctp-subtext0">{rating.scores[pillar]}</span>
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}
