import { Navigate, useSearchParams } from "react-router-dom";

export default function SharedDecksIndex() {
  const [params] = useSearchParams();
  const next = new URLSearchParams(params);
  next.set("source", "shared");
  next.delete("view");
  return <Navigate to={`/decks?${next}`} replace />;
}
