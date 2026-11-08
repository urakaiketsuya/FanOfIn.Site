import { useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { decodePackage } from "@gatcg/shared";
import CardResult from "../../components/CardResult";
import PageLayout from "../../components/layout/PageLayout";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import { InlineState } from "../../components/ui/ContentState";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useCardsByNames } from "../events/useCardsByNames";
import { addPackageToNewDeckDraft } from "../account/packageDraft";
import { useState } from "react";

/** Opens a package from a share link. The link is checked before anything is shown. */
export default function SharedPackagePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const pkg = useMemo(() => decodePackage(params.get("p") ?? ""), [params]);
  useDocumentTitle(pkg ? `${pkg.name} · Shared package` : "Shared package", "A card package shared by link.");
  const names = useMemo(() => pkg?.cards.map(card => card.name) ?? [], [pkg]);
  const art = useCardsByNames(names);
  const [error, setError] = useState("");
  if (!pkg) return <PageLayout><PageHeader title="Shared package" description="This link does not hold a valid package." />
    <InlineState className="text-sm">The link is broken or too long. Ask the sender for a new link. <Link to="/cards/staples" className="text-ctp-blue hover:underline">Browse card staples</Link></InlineState></PageLayout>;
  // Catalog availability must never change the contents of a shared draft.
  const usable = pkg.cards;
  const total = usable.reduce((sum, card) => sum + card.quantity, 0);
  function add() {
    if (!addPackageToNewDeckDraft(usable, pkg!.name)) { setError("Could not save the draft on this device. Check that site storage is allowed."); return; }
    navigate("/decks/new");
  }
  return <PageLayout>
    <PageHeader title={pkg.name} description={`${pkg.champion ? `${pkg.champion} · ` : ""}${pkg.cards.length} cards · ${total} copies. A card list shared by link. It holds no win-rate data.`} />
    {(["main", "material"] as const).map(section => {
      const lines = pkg.cards.filter(card => card.section === section);
      return lines.length ? <section key={section} className="mt-5"><h2 className="text-sm font-semibold text-ctp-text">{section === "main" ? "Main" : "Material"} · {lines.length} cards</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{lines.map(card =>
          <CardResult key={card.name} card={art.get(card.name)} name={card.name}>
            <span className="text-sm text-ctp-subtext1">{card.quantity} copies</span>
          </CardResult>)}</div></section> : null;
    })}
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <Button variant="primary" disabled={!usable.length} onClick={add}>Add to new deck</Button>
      <span className="text-xs text-ctp-subtext0">Opens the deck editor with these cards. A deck you are already drafting keeps its cards.</span>
    </div>
    {error && <p role="alert" className="mt-2 text-sm text-ctp-red">{error}</p>}
  </PageLayout>;
}
