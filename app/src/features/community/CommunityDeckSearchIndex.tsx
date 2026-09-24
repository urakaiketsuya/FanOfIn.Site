import { useState } from "react";
import type { DeckFormat } from "@gatcg/shared";
import { Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import PageLayout from "../../components/layout/PageLayout";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import CommunityDeckSearch from "./CommunityDeckSearch";

export default function CommunityDeckSearchIndex() {
  useDocumentTitle(
    "Search Community Decklists",
    "Search locally archived community Grand Archive decklists by title, player, Champion, card, or source.",
  );
  const [format, setFormat] = useState<DeckFormat>("STANDARD");
  return <PageLayout data-component="CommunityDeckSearchIndex" width="wide">
    <PageHeader title="Search Community Decklists" actions={<Link to="/community-decks" className="text-sm text-ctp-blue hover:underline">View deck trends →</Link>} />
    <p className="mt-2 max-w-3xl text-sm text-ctp-subtext1">Search decklists already sourced from ShoutAtYourDecks, Sleeved, and TCGArchitect. Results come from the local archive; opening the original deck is the only link to an outside site.</p>
    <div className="mt-5 inline-flex rounded-lg border border-ctp-surface1 bg-ctp-mantle p-1 text-sm" role="group" aria-label="Deck format">
      {(["STANDARD", "PANTHEON"] as const).map((value) => <button key={value} type="button" onClick={() => setFormat(value)} className={`rounded-md px-3 py-1.5 ${format === value ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"}`}>{value === "STANDARD" ? "Standard" : "Pantheon"}</button>)}
    </div>
    <div className="mt-4"><CommunityDeckSearch key={format} format={format} /></div>
  </PageLayout>;
}
