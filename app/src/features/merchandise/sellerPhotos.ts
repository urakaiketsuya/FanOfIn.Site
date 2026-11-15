/** Explicit source-row matches. Never join seller photos by champion name alone. */
export interface SellerPhoto {
  catalogId: string;
  name: string;
  category: string;
  listingUrl: string;
  imageUrl: string;
  seller: string;
  checkedAt: string;
}

export const sellerPhotos: readonly SellerPhoto[] = [
  {
    catalogId: "sheet-12-b13",
    name: "Nia, Mistveiled Scout",
    category: "Deckboxes",
    listingUrl: "https://www.ebay.com/itm/820306653820",
    imageUrl: "https://i.ebayimg.com/images/g/J1EAAeSw7Yxq6Hvw/s-l500.webp",
    seller: "CruzCtrlGG",
    checkedAt: "2026-11-14",
  },
  {
    catalogId: "sheet-12-f15",
    name: "Merlin, Memory Thief",
    category: "Double deckboxes",
    listingUrl: "https://www.ebay.com/itm/358012232766",
    imageUrl: "https://i.ebayimg.com/images/g/ABMAAeSwp3tpPIry/s-l1600.webp",
    seller: "silvieshop",
    checkedAt: "2026-11-14",
  },
  {
    catalogId: "sheet-12-i16",
    name: "Ariel",
    category: "Compact deckboxes",
    listingUrl: "https://www.ebay.com/itm/318574151589",
    imageUrl: "https://i.ebayimg.com/thumbs/images/g/LowAAeSwRydqVG97/s-l500.jpg",
    seller: "couchchange",
    checkedAt: "2026-11-14",
  },
];

export function sellerPhotoFor(item: { id: string; name: string; category: string }): SellerPhoto | undefined {
  return sellerPhotos.find(photo => photo.catalogId === item.id && photo.name === item.name && photo.category === item.category);
}
