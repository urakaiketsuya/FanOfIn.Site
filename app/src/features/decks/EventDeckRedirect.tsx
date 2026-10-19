import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { shortHash } from "@gatcg/shared";
import PageLayout from "../../components/layout/PageLayout";
import Button from "../../components/ui/Button";
import { useSightingDecklist } from "../topdecks/useSightingDecklist";
import { canonicalSignature } from "../popular/popularityAggregation";

function ResolveEventDeck({ eventId, player, onRetry }: { eventId: number; player: number; onRetry: () => void }) {
  const { decklist, error } = useSightingDecklist(eventId, player, true);
  if (decklist) {
    const lines = (section: typeof decklist.main) => section.map(line => ({ name: line.card, quantity: line.quantity }));
    const hash = shortHash(canonicalSignature(lines(decklist.main), lines(decklist.material)));
    return <Navigate to={`/decks/${hash}`} replace />;
  }
  return <>
    <p role={error ? "alert" : "status"}>{error ?? "Loading deck…"}</p>
    {error && <Button className="mt-4" onClick={onRetry}>Retry loading deck</Button>}
  </>;
}

/** Older sightings omit hashes for unique builds, but those builds still have deck pages. */
export default function EventDeckRedirect() {
  const { eventId = "", player = "" } = useParams();
  const [attempt, setAttempt] = useState(0);
  const valid = /^\d+$/.test(eventId) && /^\d+$/.test(player);
  return <PageLayout>
    {valid ? <>
      <ResolveEventDeck key={`${eventId}:${player}:${attempt}`} eventId={Number(eventId)} player={Number(player)} onRetry={() => setAttempt(value => value + 1)} />
    </> : <p role="alert">Invalid event deck link.</p>}
  </PageLayout>;
}
