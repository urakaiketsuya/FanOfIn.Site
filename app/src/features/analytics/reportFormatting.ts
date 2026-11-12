import type { DrawRange } from '@gatcg/shared';
export const rangeText = (value: DrawRange) => `${value.low}–${value.high}`;
export const percent = (value: number) => `${Math.round(value * 100)}%`;
