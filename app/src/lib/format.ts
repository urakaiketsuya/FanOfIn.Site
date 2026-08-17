export function formatUsd(value: number | null): string {
  return value === null ? "—" : `$${value.toFixed(2)}`;
}
