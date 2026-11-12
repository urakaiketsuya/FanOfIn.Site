import { Navigate, useLocation } from "react-router-dom";

export default function LegacyDeckEditorRedirect() {
  const location = useLocation();
  return <Navigate replace to={{ pathname: "/decks/draft", search: location.search, hash: location.hash }} state={location.state} />;
}
