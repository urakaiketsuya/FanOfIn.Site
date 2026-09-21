import { useMemo } from "react";
import { Link } from "react-router-dom";
import CardHoverPreview from "../../components/CardHoverPreview";
import ElementIcon from "../../components/ElementIcon";
import { InlineState } from "../../components/ui/ContentState";
import { formatUsd } from "../../lib/format";
import { useCardsByNames } from "../events/useCardsByNames";
import type { RegionalCardRow } from "./useRegionalCardComposition";
import type { RegionalKeywordRow } from "./useRegionalKeywords";

type LiftSign = "positive" | "negative";

function LiftBadges({ lift, sign, regionRate, globalRate }: { lift: number; sign: LiftSign; regionRate: number; globalRate: number }) {
  return (
    <>
      <span className={`ml-auto shrink-0 text-xs ${sign === "positive" ? "text-ctp-green" : "text-ctp-red"}`}>
        {lift >= 0 ? "+" : ""}{(lift * 100).toFixed(1)}pp
      </span>
      <span className="shrink-0 text-xs text-ctp-subtext0">
        {(regionRate * 100).toFixed(0)}% here vs {(globalRate * 100).toFixed(0)}% overall
      </span>
    </>
  );
}

export function CardLiftList({ rows, sign }: { rows: RegionalCardRow[]; sign: LiftSign }) {
  const names = useMemo(() => rows.map((row) => row.cardName), [rows]);
  const cardsByName = useCardsByNames(names);
  if (rows.length === 0) return <InlineState className="text-sm">Nothing clears the sample bar yet.</InlineState>;
  return (
    <ul className="mt-2 space-y-1">
      {rows.map((row) => {
        const card = cardsByName.get(row.cardName);
        return (
          <li key={row.cardName} className="flex flex-wrap items-center gap-1.5 text-sm">
            {card && <ElementIcon element={card.element} size={14} />}
            {card ? <CardHoverPreview image={card.editions[0]?.image} alt={row.cardName}><Link to={`/cards/${card.slug}`} className="text-ctp-text hover:text-ctp-blue">{row.cardName}</Link></CardHoverPreview> : <span className="text-ctp-text">{row.cardName}</span>}
            <span className="rounded-full border border-ctp-surface1 px-1.5 text-[10px] text-ctp-subtext0">{(row.avgWinRate * 100).toFixed(0)}% win rate</span>
            {row.marketPrice !== null && <span className="rounded-full border border-ctp-surface1 px-1.5 text-[10px] text-ctp-subtext0">{formatUsd(row.marketPrice)}</span>}
            <LiftBadges lift={row.lift} sign={sign} regionRate={row.regionRate} globalRate={row.globalRate} />
          </li>
        );
      })}
    </ul>
  );
}

export function KeywordLiftList({ rows, sign }: { rows: RegionalKeywordRow[]; sign: LiftSign }) {
  if (rows.length === 0) return <InlineState className="text-sm">Nothing clears the sample bar yet.</InlineState>;
  return (
    <ul className="mt-2 space-y-1">
      {rows.map((row) => (
        <li key={row.keyword} className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-ctp-text">{row.keyword}</span>
          <span className="rounded-full border border-ctp-surface1 px-1.5 text-[10px] text-ctp-subtext0">{(row.avgWinRate * 100).toFixed(0)}% win rate</span>
          <LiftBadges lift={row.lift} sign={sign} regionRate={row.regionRate} globalRate={row.globalRate} />
        </li>
      ))}
    </ul>
  );
}
