import { useMemo } from "react";
import { Link } from "react-router-dom";
import CardImage from "../../components/CardImage";
import { InlineState } from "../../components/ui/ContentState";
import { useCardsByNames } from "../events/useCardsByNames";
import type { RegionalCardRow } from "./useRegionalCardComposition";
import type { RegionalKeywordRow } from "./useRegionalKeywords";

type LiftSign = "positive" | "negative";

function LiftSummary({ lift, sign, regionRate, globalRate }: { lift: number; sign: LiftSign; regionRate: number; globalRate: number }) {
  return (
    <div className="mt-auto pt-2">
      <div className={`text-sm font-semibold ${sign === "positive" ? "text-ctp-green" : "text-ctp-red"}`}>
        {lift >= 0 ? "+" : ""}{(lift * 100).toFixed(1)}pp
      </div>
      <div className="text-[11px] text-ctp-subtext0">{(regionRate * 100).toFixed(0)}% here · {(globalRate * 100).toFixed(0)}% overall</div>
    </div>
  );
}

export function CardLiftList({ rows, sign }: { rows: RegionalCardRow[]; sign: LiftSign }) {
  const names = useMemo(() => rows.map((row) => row.cardName), [rows]);
  const cardsByName = useCardsByNames(names);
  if (rows.length === 0) return <InlineState className="text-sm">Nothing clears the sample bar yet.</InlineState>;
  return (
    <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {rows.map((row) => {
        const card = cardsByName.get(row.cardName);
        return (
          <li key={row.cardName} className="flex min-w-0 flex-col rounded-xl border border-ctp-surface1 bg-ctp-mantle p-2">
            {card?.editions[0]?.image ? <Link to={`/cards/${card.slug}`}><CardImage image={card.editions[0].image} alt={row.cardName} className="aspect-[5/7] w-full rounded-lg object-cover" /></Link> : <div className="aspect-[5/7] rounded-lg bg-ctp-surface0" />}
            {card ? <Link to={`/cards/${card.slug}`} className="mt-2 line-clamp-2 text-sm font-medium text-ctp-text hover:text-ctp-blue">{row.cardName}</Link> : <div className="mt-2 line-clamp-2 text-sm font-medium text-ctp-text">{row.cardName}</div>}
            <LiftSummary lift={row.lift} sign={sign} regionRate={row.regionRate} globalRate={row.globalRate} />
          </li>
        );
      })}
    </ul>
  );
}

export function KeywordLiftList({ rows, sign }: { rows: RegionalKeywordRow[]; sign: LiftSign }) {
  if (rows.length === 0) return <InlineState className="text-sm">Nothing clears the sample bar yet.</InlineState>;
  return (
    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
      {rows.map((row) => (
        <li key={row.keyword} className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3">
          <div className="font-medium text-ctp-text">{row.keyword}</div>
          <LiftSummary lift={row.lift} sign={sign} regionRate={row.regionRate} globalRate={row.globalRate} />
        </li>
      ))}
    </ul>
  );
}
