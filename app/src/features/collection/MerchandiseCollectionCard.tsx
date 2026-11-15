import { useState } from "react";
import { Link } from "react-router-dom";
import type { MerchandiseCollectionItem } from "@gatcg/shared";
import MerchandisePhoto from "../merchandise/MerchandisePhoto";
import { needsMerchandisePhoto } from "../merchandise/photoSources";

function LegacyImage({ url, name }: { url: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? <p className="rounded-lg bg-ctp-surface0 p-6 text-sm">Photo unavailable</p>
    : <img src={url} alt={name} loading="lazy" onError={() => setFailed(true)} className="h-64 w-full rounded-lg bg-ctp-base object-contain" />;
}

/** Presentation only; drafts and persistence stay in the collection controller. */
export default function MerchandiseCollectionCard({ items, quantities, disabled, onEdit }: {
  items: MerchandiseCollectionItem[];
  quantities: Record<string, number>;
  disabled: boolean;
  onEdit: (id: string, quantity: number) => void;
}) {
  const item = items[0];
  const bundle = item.bundle?.overviewImageUrl ? item.bundle : undefined;
  const entry = item.catalogEntry;
  const title = bundle ? `${bundle.champion} · ${bundle.releaseName}` : item.name;
  const hasCatalogPhoto = entry && !needsMerchandisePhoto(entry);
  const fallback = bundle?.overviewImageUrl ?? item.bundle?.productImageUrl;
  return <article className="min-w-0 rounded-xl border border-ctp-surface1 bg-ctp-mantle/70 p-3">
    {hasCatalogPhoto ? <MerchandisePhoto item={entry} /> : fallback ? <LegacyImage key={fallback} url={fallback} name={bundle ? `${title} · full set overview` : title} /> : null}
    {bundle && <p className="mt-2 text-xs text-ctp-subtext1">Full set overview</p>}
    <p className="mt-2 text-xs text-ctp-mauve">{bundle ? "Merchandise sets" : item.category}</p>
    <h3 className="mt-1 break-words text-lg font-semibold">{title}</h3>
    {item.detail && !bundle && <p className="mt-1 text-sm text-ctp-subtext1">{item.detail}</p>}
    <div className="mt-3 space-y-2">{items.map(component => <label key={component.id} className="flex items-center justify-between gap-3 rounded-lg bg-ctp-surface0/40 p-2">
      <span className="min-w-0 break-words text-sm">{bundle ? component.name : component.quantityUnit}</span>
      <input aria-label={`${component.name} quantity`} type="number" min={0} max={999} step={1} inputMode="numeric" disabled={disabled} value={quantities[component.id] ?? 0}
        onChange={event => { const value = Number(event.target.value); if (Number.isInteger(value) && value >= 0 && value <= 999) onEdit(component.id, value); }}
        className="min-h-12 w-20 shrink-0 rounded-lg border border-ctp-surface1 bg-ctp-base px-2 text-center text-base focus-visible:outline-2 focus-visible:outline-ctp-blue" />
    </label>)}</div>
    <div className="mt-2 flex flex-wrap gap-2">
      {entry && <Link to={`/merchandise?q=${encodeURIComponent(entry.name)}&category=${encodeURIComponent(entry.category)}`} className="inline-flex min-h-12 items-center px-2 text-sm text-ctp-blue underline">View in catalog</Link>}
      {!hasCatalogPhoto && <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center px-2 text-sm text-ctp-blue underline">{item.bundle ? "Official source" : "Catalog source"} ↗</a>}
    </div>
  </article>;
}
