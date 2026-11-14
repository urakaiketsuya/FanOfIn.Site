import photos from "./reviewedPhotos.json";

/** Exact reviewed rows only: character names alone cannot distinguish box variants. */
export function reviewedPhotoFor(item: { id: string; name: string; category: string; detail: string }) {
  return photos.find(photo => photo.catalogId === item.id && photo.name === item.name && photo.category === item.category && photo.detail === item.detail);
}
