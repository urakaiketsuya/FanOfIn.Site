import { reviewedPhotoFor } from "./reviewedPhotos";
import { galleryImageUrl, imgurEmbedUrl } from "./photoPresentation";
import { sellerPhotoFor } from "./sellerPhotos";
import { manufacturerPhotoFor } from "./manufacturerPhotos";

export interface PhotoItem { id: string; name: string; category: string; detail: string; photoUrl: string }

export function merchandisePhotoSources(item: PhotoItem) {
  const reviewed = reviewedPhotoFor(item);
  const seller = sellerPhotoFor(item);
  const manufacturer = manufacturerPhotoFor(item);
  const embedUrl = imgurEmbedUrl(item.photoUrl);
  const imageUrl = reviewed?.imageUrl ?? manufacturer?.imageUrl ?? seller?.imageUrl ?? galleryImageUrl(item.photoUrl);
  return { reviewed, seller, manufacturer, embedUrl, imageUrl };
}

export function needsMerchandisePhoto(item: PhotoItem) {
  const { imageUrl, embedUrl } = merchandisePhotoSources(item);
  return !imageUrl && !embedUrl;
}
