import { cardLegalityStatus, type Card, type DeckFormat } from "@gatcg/shared";
export default function CardLegalityBadge({ card, format }: { card?: Card; format: DeckFormat }) {
  const status = cardLegalityStatus(card, format);
  if (status === "allowed") return null;
  return <span className={`my-1 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold ${status === "banned" ? "border-ctp-red/60 bg-ctp-red/10 text-ctp-red" : "border-ctp-surface1 text-ctp-subtext1"}`}>{status === "banned" && <span aria-hidden="true">⚠</span>}{status === "banned" ? `Banned in ${format === "PANTHEON" ? "Pantheon" : "Standard"}` : "Legality unverified"}</span>;
}
