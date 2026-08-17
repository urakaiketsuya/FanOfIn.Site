import { fetchJson } from "../lib/http.js";

const BASE_URL = "https://tcgcsv.com/tcgplayer";

/** Stable as of this writing, but re-looked-up each run via GA_ARCHIVE_CATEGORY_NAME rather than trusted blindly. */
const GA_ARCHIVE_CATEGORY_NAME = "Grand Archive";
const FALLBACK_CATEGORY_ID = 74;

interface TcgcsvListResponse<T> {
  results: T[];
}

export interface TcgcsvCategory {
  categoryId: number;
  name: string;
}

export interface TcgcsvGroup {
  groupId: number;
  name: string;
  abbreviation: string;
  categoryId: number;
}

export interface TcgcsvExtendedDataField {
  name: string;
  displayName: string;
  value: string;
}

export interface TcgcsvProduct {
  productId: number;
  name: string;
  groupId: number;
  url: string;
  extendedData: TcgcsvExtendedDataField[];
}

export interface TcgcsvPrice {
  productId: number;
  lowPrice: number | null;
  midPrice: number | null;
  highPrice: number | null;
  marketPrice: number | null;
  subTypeName: string;
}

export async function findGrandArchiveCategoryId(): Promise<number> {
  try {
    const res = await fetchJson<TcgcsvListResponse<TcgcsvCategory>>(`${BASE_URL}/categories`);
    const match = res.results.find((c) => c.name === GA_ARCHIVE_CATEGORY_NAME);
    if (match) return match.categoryId;
    console.warn(`TCGCSV category "${GA_ARCHIVE_CATEGORY_NAME}" not found, falling back to id ${FALLBACK_CATEGORY_ID}`);
  } catch (err) {
    console.warn("failed to fetch TCGCSV categories, falling back to known category id", err);
  }
  return FALLBACK_CATEGORY_ID;
}

export async function fetchGroups(categoryId: number): Promise<TcgcsvGroup[]> {
  const res = await fetchJson<TcgcsvListResponse<TcgcsvGroup>>(`${BASE_URL}/${categoryId}/groups`);
  return res.results;
}

export async function fetchProducts(categoryId: number, groupId: number): Promise<TcgcsvProduct[]> {
  const res = await fetchJson<TcgcsvListResponse<TcgcsvProduct>>(`${BASE_URL}/${categoryId}/${groupId}/products`);
  return res.results;
}

export async function fetchPrices(categoryId: number, groupId: number): Promise<TcgcsvPrice[]> {
  const res = await fetchJson<TcgcsvListResponse<TcgcsvPrice>>(`${BASE_URL}/${categoryId}/${groupId}/prices`);
  return res.results;
}
