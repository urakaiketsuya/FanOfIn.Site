import type { WinRatePackageStatus } from "@gatcg/shared";
export const LABELS: Record<WinRatePackageStatus, string> = {
  "positive-in-later-events": "Positive in later events",
  "not-repeated": "Did not repeat",
  "insufficient-later-data": "Insufficient later data",
};
export const percent = (value: number | null) => value === null ? "Unavailable" : `${(value * 100).toFixed(1)}%`;
export const points = (value: number | null) => value === null ? "Unavailable" : `${value > 0 ? "+" : ""}${(value * 100).toFixed(1)} pp`;
export const control = "min-h-12 rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm text-ctp-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue";
export const summary = "flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ctp-blue [&::-webkit-details-marker]:hidden";

