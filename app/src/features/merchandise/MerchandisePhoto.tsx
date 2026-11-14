import { reviewedPhotoFor } from "./reviewedPhotos";
import { useState } from "react";
import { galleryImageUrl, imgurEmbedUrl } from "./photoPresentation";
import { sellerPhotoFor } from "./sellerPhotos";
import { manufacturerPhotoFor } from "./manufacturerPhotos";

interface PhotoItem { id: string; name: string; category: string; detail: string; photoUrl: string }

function PhotoImage({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return failed
    ? <div className="flex h-64 items-center justify-center bg-ctp-crust p-4 text-center text-sm text-ctp-subtext1">Photo unavailable</div>
    : <img src={src} alt={name} loading="lazy" decoding="async" onError={() => setFailed(true)} className="h-64 w-full bg-ctp-crust object-contain p-2" />;
}

export default function MerchandisePhoto({ item }: { item: PhotoItem }) {
  const reviewed = reviewedPhotoFor(item);
  const seller = sellerPhotoFor(item);
  const manufacturer = manufacturerPhotoFor(item);
  const embedUrl = imgurEmbedUrl(item.photoUrl);
  const imageUrl = reviewed?.imageUrl ?? manufacturer?.imageUrl ?? seller?.imageUrl ?? galleryImageUrl(item.photoUrl);
  if (!imageUrl && !embedUrl) return null;
  return <figure className="mb-3 overflow-hidden rounded-lg border border-ctp-surface0 bg-ctp-crust">
    {imageUrl ? <PhotoImage key={imageUrl} src={imageUrl} name={`${item.name} · ${item.category}${reviewed?.group ? " · group photo of three compact deckboxes" : ""}${seller ? " · seller photo" : ""}`} /> : <iframe
      key={embedUrl}
      src={embedUrl}
      title={`Photos of ${item.name} · ${item.category}`}
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      sandbox="allow-scripts allow-same-origin allow-popups"
      className="h-80 w-full border-0"
    />}
    <figcaption><a href={reviewed?.sourceUrl ?? manufacturer?.productUrl ?? seller?.listingUrl ?? item.photoUrl} target="_blank" rel="noreferrer" className="flex min-h-12 items-center px-3 text-sm text-ctp-blue hover:bg-ctp-surface0 focus-visible:outline-2 focus-visible:outline-ctp-blue" aria-label={`Open ${reviewed ? "source" : manufacturer ? "manufacturer" : seller ? "seller" : "source"} photos of ${item.name}`}>
      {reviewed ? `${reviewed.group ? "Group photo" : reviewed.kind === "reference" ? "Reference photo" : reviewed.kind === "seller" ? "Seller photo" : "Official photo"} · ${reviewed.sourceName} ↗` : manufacturer ? `Product photo · ${manufacturer.sourceName} ↗` : seller ? "Seller photo · eBay ↗" : imageUrl ? "Photo source · ImgBB ↗" : "Photo gallery · Imgur ↗"}
    </a></figcaption>
  </figure>;
}
