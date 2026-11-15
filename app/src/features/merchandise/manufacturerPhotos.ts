import photos from "./manufacturerPhotos.json";

/** Reviewed product matches, including the source's retail/event distinction. */
export function manufacturerPhotoFor(item: { id: string; name: string; category: string; detail: string }) {
  return photos.find(photo => photo.catalogId === item.id && photo.name === item.name && photo.category === item.category && photo.detail === item.detail);
}
