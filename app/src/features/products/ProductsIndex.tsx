import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useFeaturedSets } from "../sets/useFeaturedSets";
import { isBoosterSet } from "../packs/boosterSets";
import { PRODUCTS, PRODUCTS_ATTRIBUTION, type ProductEntry } from "./data";

const TYPE_COLORS: Record<ProductEntry["type"], string> = {
  Standard: "border-ctp-blue text-ctp-blue",
  Expansion: "border-ctp-mauve text-ctp-mauve",
  Capstone: "border-ctp-peach text-ctp-peach",
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(iso));
}

function ProductCard({ product, hasPack }: { product: ProductEntry; hasPack: boolean }) {
  const upcoming = product.releaseDate > new Date().toISOString().slice(0, 10);
  const anchor = `product-${product.prefix.split(" ")[0].toLowerCase()}`;
  return (
    <article id={anchor} className="scroll-mt-20 overflow-hidden rounded-xl border border-ctp-surface0 bg-ctp-mantle/70 shadow-sm target:ring-2 target:ring-ctp-blue">
      <img src={product.boxArt} alt="" className="h-40 w-full object-contain bg-ctp-crust p-3" />
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${TYPE_COLORS[product.type]}`}>{product.type}</span>
          <span className="text-xs text-ctp-subtext0">{upcoming ? "Releases" : "Released"} {formatDate(product.releaseDate)}</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <img src={product.logo} alt="" className="h-8 w-auto object-contain" />
          <h2 className="text-lg font-semibold text-ctp-text">{product.name}</h2>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to={`/cards?tab=browse&set=${encodeURIComponent(product.prefix)}`}
            className="rounded-md border border-ctp-surface1 px-2.5 py-1.5 text-xs text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-text"
          >
            View cards from this set &rarr;
          </Link>
          {hasPack && (
            <Link
              to={`/packs/${encodeURIComponent(product.prefix)}`}
              className="rounded-md border border-ctp-green px-2.5 py-1.5 text-xs text-ctp-green hover:bg-ctp-surface0"
            >
              Open a pack &rarr;
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export default function ProductsIndex() {
  useDocumentTitle("Products", "Official Grand Archive TCG product releases — Standard sets, Expansions, and Capstone sets.");
  const featuredSets = useFeaturedSets();

  const boosterPrefixes = useMemo(() => {
    const prefixes = new Set<string>();
    for (const group of featuredSets ?? []) {
      for (const set of group.sets) {
        if (isBoosterSet(set, group)) prefixes.add(set.prefix);
      }
    }
    return prefixes;
  }, [featuredSets]);

  const sorted = useMemo(() => [...PRODUCTS].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate)), []);

  useEffect(() => {
    if (!window.location.hash) return;
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: "start" });
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title="Products"
        description="Every Grand Archive TCG set release, official art, and a link into that set's cards or a live pack simulation."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((product) => (
          <ProductCard key={product.prefix} product={product} hasPack={boosterPrefixes.has(product.prefix)} />
        ))}
      </div>
      <p className="mt-8 text-xs text-ctp-subtext0">{PRODUCTS_ATTRIBUTION}</p>
    </div>
  );
}
