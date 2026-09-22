import type { Card } from "@gatcg/shared";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import CardImage from "../../components/CardImage";

export default function CardRelatedRow({ card, summary, detail }: { card: Card; summary: ReactNode; detail?: ReactNode }) {
  return <li className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-2.5">
    <div className="flex items-start gap-3">
      <Link to={`/cards/${card.slug}`} className="shrink-0"><CardImage image={card.editions[0]?.image ?? ""} alt={card.name} className="h-24 w-[69px] rounded-md object-cover" /></Link>
      <div className="min-w-0 flex-1">
        <Link to={`/cards/${card.slug}`} className="text-sm font-semibold text-ctp-text hover:text-ctp-blue">{card.name}</Link>
        <div className="mt-1 text-xs text-ctp-subtext1">{summary}</div>
        {detail && <details className="mt-2 text-xs text-ctp-subtext0"><summary className="cursor-pointer text-ctp-blue">More details</summary><div className="mt-1">{detail}</div></details>}
      </div>
    </div>
  </li>;
}
