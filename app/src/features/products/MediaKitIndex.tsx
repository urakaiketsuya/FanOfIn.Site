import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import PageLayout from "../../components/layout/PageLayout";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useCardsByNames } from "../events/useCardsByNames";
import { CHARACTER_CUTOUTS } from "./characterArt";
import { PRODUCTS, PRODUCTS_ATTRIBUTION, type ProductEntry } from "./data";

const CUTOUT_NAMES = Object.keys(CHARACTER_CUTOUTS);

/** The `<prefix>/logo.png` etc. asset-folder code — bare (no "1st"/"Alter" suffix), unlike
 * ProductEntry.prefix which carries the exact Cards-filter value (e.g. "DOA 1st"). */
function assetCode(product: ProductEntry): string {
  return product.prefix.split(" ")[0];
}

type Thumb = { label: string; image: string; cardSlug?: string };

function Lightbox({ thumb, onClose }: { thumb: Thumb; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])') ?? []);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={thumb.label}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ctp-crust/90 p-6"
    >
      <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-2xl text-ctp-subtext0 hover:text-ctp-text">
        ×
      </button>
      <figure className="flex max-h-full max-w-full flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <img src={thumb.image} alt={thumb.label} className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl" />
        <figcaption className="text-sm text-ctp-subtext1">
          {thumb.label}
          {thumb.cardSlug && (
            <>
              {" · "}
              <Link to={`/cards/${thumb.cardSlug}`} className="text-ctp-blue hover:underline">
                View card
              </Link>
            </>
          )}
        </figcaption>
      </figure>
    </div>
  );
}

function ProductMediaSection({ product, cutouts, onSelect }: { product: ProductEntry; cutouts: Thumb[]; onSelect: (t: Thumb) => void }) {
  const thumbs: Thumb[] = [
    { label: `${product.name} — Box art`, image: product.boxArt },
    ...(product.banner ? [{ label: `${product.name} — Banner`, image: product.banner }] : []),
    ...cutouts,
  ];

  return (
    <section className="rounded-xl border border-ctp-surface0 bg-ctp-mantle/70 p-4">
      <div className="flex items-center gap-3">
        <img src={product.logo} alt="" className="h-8 w-auto object-contain" />
        <h2 className="text-lg font-semibold text-ctp-text">{product.name}</h2>
        <Link to={`/products#product-${assetCode(product).toLowerCase()}`} className="ml-auto text-xs text-ctp-blue hover:underline">
          Product page &rarr;
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {thumbs.map((thumb) => (
          <button
            key={thumb.image}
            type="button"
            onClick={() => onSelect(thumb)}
            title={thumb.label}
            className="group overflow-hidden rounded-md border border-ctp-surface1 bg-ctp-crust"
          >
            <img src={thumb.image} alt={thumb.label} className="h-24 w-full object-contain p-1 transition-transform group-hover:scale-105" />
          </button>
        ))}
      </div>
    </section>
  );
}

export default function MediaKitIndex() {
  useDocumentTitle("Media Kit", "Browse every official Grand Archive TCG media-kit asset used on this site — logos, box art, key art, and character cutouts.");
  const cutoutCards = useCardsByNames(CUTOUT_NAMES);
  const [selected, setSelected] = useState<Thumb | null>(null);

  const cutoutsByProduct = useMemo(() => {
    const map = new Map<string, Thumb[]>();
    for (const [cardName, image] of Object.entries(CHARACTER_CUTOUTS)) {
      const match = /^\/media\/products\/([^/]+)\//.exec(image);
      if (!match) continue;
      const code = match[1];
      const card = cutoutCards.get(cardName);
      const list = map.get(code) ?? [];
      list.push({ label: cardName, image, cardSlug: card?.slug });
      map.set(code, list);
    }
    return map;
  }, [cutoutCards]);

  const sorted = useMemo(() => [...PRODUCTS].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate)), []);

  return (
    <PageLayout data-component="MediaKitIndex" width="wide">
      <PageHeader
        title="Media Kit"
        description="Every official Grand Archive TCG media-kit asset used on this site, grouped by product. Click any thumbnail to enlarge."
      />
      <div className="space-y-6">
        {sorted.map((product) => (
          <ProductMediaSection
            key={product.prefix}
            product={product}
            cutouts={cutoutsByProduct.get(assetCode(product)) ?? []}
            onSelect={setSelected}
          />
        ))}
      </div>
      <p className="mt-8 text-xs text-ctp-subtext0">{PRODUCTS_ATTRIBUTION}</p>
      {selected && <Lightbox thumb={selected} onClose={() => setSelected(null)} />}
    </PageLayout>
  );
}
