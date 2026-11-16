import type { useCardWinRates } from "../features/cards/useCardWinRates";
import Button from "./ui/Button";

export default function WinRateSortStatus({ state }: { state: ReturnType<typeof useCardWinRates> }) {
  if (state.loaded) return null;
  return <p role="status" className="mt-2 text-sm text-ctp-subtext1">{state.status.phase === "error" ? <>Win rates unavailable. <Button variant="ghost" onClick={state.status.retry}>Retry win rates</Button></> : "Loading win rates…"}</p>;
}
