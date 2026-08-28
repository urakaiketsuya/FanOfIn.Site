// Hand-authored, like ../official-products/data.ts's release-date table — there's no API for this,
// and product releases are infrequent (~5-6/year). To add a new set: visit its
// /article/<slug>-product-information page on gatcg.com, download the linked Media Kit, pick a
// logo/box render/hero image, resize each to roughly the sizes already committed under
// app/public/media/products/<prefix>/, and add one entry below.
export type ProductType = "Standard" | "Expansion" | "Capstone";

export interface ProductEntry {
  /** Join key into the Cards page's `set` filter param, e.g. `/cards?tab=browse&set=${prefix}`. */
  prefix: string;
  name: string;
  type: ProductType;
  releaseDate: string;
  logo: string;
  boxArt: string;
  /** Best available key art (print poster > world/background art > a character cutout) — omitted when a kit had nothing suitable. */
  banner?: string;
}

export const PRODUCTS: ProductEntry[] = [
  {
    prefix: "CBL",
    name: ".asphodel/cantabile",
    type: "Expansion",
    releaseDate: "2026-12-11",
    logo: "/media/products/CBL/logo.png",
    boxArt: "/media/products/CBL/box.jpg",
    banner: "/media/products/CBL/banner.jpg",
  },
  {
    prefix: "PRD",
    name: ".asphodel/paradise",
    type: "Standard",
    releaseDate: "2026-08-21",
    logo: "/media/products/PRD/logo.png",
    boxArt: "/media/products/PRD/box.jpg",
    banner: "/media/products/PRD/banner.jpg",
  },
  {
    prefix: "RDO",
    name: "Radiant Origins",
    type: "Capstone",
    releaseDate: "2026-04-03",
    logo: "/media/products/RDO/logo.png",
    boxArt: "/media/products/RDO/box.jpg",
    banner: "/media/products/RDO/banner.jpg",
  },
  {
    prefix: "PTM",
    name: "Phantom Monarchs",
    type: "Expansion",
    releaseDate: "2025-12-05",
    logo: "/media/products/PTM/logo.png",
    boxArt: "/media/products/PTM/box.jpg",
    banner: "/media/products/PTM/banner.jpg",
  },
  {
    prefix: "DTR",
    name: "Distorted Reflections",
    type: "Standard",
    releaseDate: "2025-07-25",
    logo: "/media/products/DTR/logo.png",
    boxArt: "/media/products/DTR/box.jpg",
    banner: "/media/products/DTR/banner.jpg",
  },
  {
    prefix: "HVN",
    name: "Abyssal Heaven",
    type: "Expansion",
    releaseDate: "2025-03-07",
    logo: "/media/products/HVN/logo.png",
    boxArt: "/media/products/HVN/box.jpg",
    banner: "/media/products/HVN/banner.jpg",
  },
  {
    prefix: "AMB",
    name: "Mortal Ambition",
    type: "Standard",
    releaseDate: "2024-10-11",
    logo: "/media/products/AMB/logo.png",
    boxArt: "/media/products/AMB/box.jpg",
    banner: "/media/products/AMB/banner.jpg",
  },
  {
    prefix: "MRC",
    name: "Mercurial Heart",
    type: "Expansion",
    releaseDate: "2024-05-17",
    logo: "/media/products/MRC/logo.png",
    boxArt: "/media/products/MRC/box.jpg",
    banner: "/media/products/MRC/banner.jpg",
  },
  {
    prefix: "ALC",
    name: "Alchemical Revolution",
    type: "Standard",
    releaseDate: "2024-01-26",
    logo: "/media/products/ALC/logo.png",
    boxArt: "/media/products/ALC/box.jpg",
    banner: "/media/products/ALC/banner.jpg",
  },
  {
    prefix: "FTC",
    name: "Fractured Crown",
    type: "Expansion",
    releaseDate: "2023-08-25",
    logo: "/media/products/FTC/logo.png",
    boxArt: "/media/products/FTC/box.jpg",
    banner: "/media/products/FTC/banner.png",
  },
  {
    prefix: "DOA 1st",
    name: "Dawn of Ashes",
    type: "Standard",
    releaseDate: "2023-04-28",
    logo: "/media/products/DOA/logo.png",
    boxArt: "/media/products/DOA/box.jpg",
    banner: "/media/products/DOA/banner.png",
  },
];

export const PRODUCTS_ATTRIBUTION = "Official Grand Archive TCG assets, used with permission for community projects — © Weebs of the Shore LLC.";
