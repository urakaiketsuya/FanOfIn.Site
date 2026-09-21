import PageLayout from "../../components/layout/PageLayout";
import PageHeader from "../../components/ui/PageHeader";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PantheonDecksView from "./PantheonDecksView";

export default function PantheonDecksIndex() {
  useDocumentTitle(
    "Browse Pantheon Decks",
    "Search community Pantheon decklists by Champion, card, or Boon.",
  );

  return (
    <PageLayout data-component="PantheonDecksIndex">
      <PageHeader
        title="Browse Pantheon Decks"
        description="Search community decklists by Champion, card, or Boon. These lists are separate from tournament results."
      />
      <PantheonDecksView />
    </PageLayout>
  );
}
