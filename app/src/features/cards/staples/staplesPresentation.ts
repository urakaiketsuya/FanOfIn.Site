export const fieldClass = "min-h-control w-full min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm text-ctp-text focus-visible:outline-2 focus-visible:outline-ctp-blue";
export const titleCase = (value: string) => value === "NORM" ? "Norm" : value.toLowerCase().replace(/(^|[- ])\w/g, c => c.toUpperCase());
