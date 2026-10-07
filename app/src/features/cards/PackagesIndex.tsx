import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { PUBLISHED_PACKAGE_CATALOG } from "@gatcg/shared";
import PageLayout from "../../components/layout/PageLayout";
import PageHeader from "../../components/ui/PageHeader";
import Panel from "../../components/ui/Panel";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PackageCardGrid from "./PackageCardGrid";
import { useCardCatalog } from "./useCardCatalog";

const PackageResearch = lazy(() => import("./PackageResearch"));

/** Keep legacy research links working while published package links open the public catalog. */
export default function PackagesIndex() {
  const location = useLocation();
  let packageId = "";
  try { packageId = decodeURIComponent(location.hash.slice(1)); } catch { /* Ignore malformed links. */ }
  const research = new URLSearchParams(location.search).get("review") === "1"
    || (!!packageId && packageId !== "main-content" && !PUBLISHED_PACKAGE_CATALOG.packages.some(pkg => pkg.id === packageId));
  const [visitedResearch, setVisitedResearch] = useState(research);
  useEffect(() => { if (research) setVisitedResearch(true); }, [research]);
  return <>
    {(research || visitedResearch) && <div hidden={!research}><Suspense fallback={<p role="status" className="p-4">Loading package research…</p>}><PackageResearch active={research} /></Suspense></div>}
    <div hidden={research}><PublishedPackages packageId={research ? "" : packageId} visible={!research} /></div>
  </>;
}

function PublishedPackages({ packageId, visible }: { packageId: string; visible: boolean }) {
  useDocumentTitle(visible ? "Card Packages" : "Package Research");
  const cards = useCardCatalog();
  const cardsByName = useMemo(() => new Map(cards.map(card => [card.name, card])), [cards]);
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (!packageId) return;
    setQuery("");
    requestAnimationFrame(() => document.getElementById(packageId)?.scrollIntoView({ block: "start" }));
  }, [packageId]);
  const normalized = query.trim().toLowerCase();
  const packages = PUBLISHED_PACKAGE_CATALOG.packages.filter(pkg =>
    !normalized || [pkg.label, ...pkg.memberCards].some(value => value.toLowerCase().includes(normalized)));
  return <PageLayout width="wide">
    <PageHeader title="Card Packages" actions={<Link to="/cards/packages?review=1" className="inline-flex min-h-12 items-center rounded-lg px-3 text-ctp-teal focus-visible:outline-2 focus-visible:outline-ctp-teal">Package research</Link>} />
    <label className="block text-sm">Find a package or card
      <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Argus, Turbo Charge…" className="mt-2 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ctp-teal" />
    </label>
    <p role="status" className="my-4 text-sm text-ctp-subtext0">{packages.length} published {packages.length === 1 ? "package" : "packages"}</p>
    {!packages.length && <p>No packages match your search.</p>}
    <div className="space-y-4">
      {packages.map(pkg => {
        const captions = new Map(pkg.requirements.flatMap(requirement => requirement.cards.map(name => [name,
          `${requirement.section === "main" ? "Main" : "Material"} · ${requirement.minimum === requirement.cards.length ? "Required" : `At least ${requirement.minimum} of ${requirement.cards.length}`}`] as const)));
        const banned = pkg.memberCards.filter(name => cardsByName.get(name)?.legality?.STANDARD?.limit === 0);
        return <Panel as="article" key={pkg.id} id={pkg.id} className="min-w-0 scroll-mt-32">
          <h2 className="break-words text-lg font-semibold"><Link className="inline-flex min-h-12 items-center rounded focus-visible:outline-2 focus-visible:outline-ctp-teal" to={`#${pkg.id}`}>{pkg.label}</Link></h2>
          <p className="text-sm text-ctp-subtext0">Full card pool · {pkg.memberCards.length} cards</p>
          <PackageCardGrid names={pkg.memberCards} cardsByName={cardsByName} captions={captions} />
          <p className="mt-4 text-sm">{pkg.explanation}</p>
          <p className="mt-2 text-sm text-ctp-subtext1"><span className="font-semibold">Required setup: </span>{pkg.activation}</p>
          {banned.length > 0 && <p className="mt-2 text-sm text-ctp-peach">Banned in Standard: {banned.join(", ")}</p>}
        </Panel>;
      })}
    </div>
  </PageLayout>;
}
