import { basicDeckStats, type Card } from "@gatcg/shared";
import DeckCardAccess from "../../components/DeckCardAccess";
import Panel from "../../components/ui/Panel";

export default function DeckAccessSummary({ mainLines, cardsByName, onExplore }: {
  mainLines: { name: string; quantity: number }[];
  cardsByName: Map<string, Card>;
  onExplore?: (name: string) => void;
}) {
  const stats = basicDeckStats(mainLines.map(line => ({ card: line.name, quantity: line.quantity })), cardsByName);
  return <Panel data-component="DeckAccessSummary">
    {stats.total === 0 ? <p role="status">Add Main cards to calculate access.</p> : <DeckCardAccess size={stats.total} groups={stats.copies} cardsByName={cardsByName} onExplore={onExplore} />}
  </Panel>;
}
