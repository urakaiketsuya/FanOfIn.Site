export const percentage = (value: number | null) => value === null ? 'Unavailable' : `${value.toFixed(1)}%`;
export const monthLabel = (month: string) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' });
