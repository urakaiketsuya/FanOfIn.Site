/** Reviewed legality history, separate from current catalog legality. */
export interface BanRegime { id: string; format: string; effective: string; through: string; source: string; changes: string[] }
export interface CompetitiveEvent {
    season: { id: number; name: string; dateStart: string; dateEnd: string } | null;
    completed: string | null;
}
export function competitivePeriod(date: string, format: string, event: CompetitiveEvent | undefined, regimes: readonly BanRegime[]) {
    const season = event?.season;
    if (!season || !Number.isSafeInteger(season.id) || !Number.isFinite(Date.parse(season.dateStart)) || !Number.isFinite(Date.parse(season.dateEnd)) || date < season.dateStart.slice(0, 10) || date > season.dateEnd.slice(0, 10))
        return { key: null, seasonId: null, banRegime: null, status: 'unknown-season' };
    const completion = event?.completed?.slice(0, 10);
    const boundary = regimes.some(r => r.format === format && r.effective > date && completion && r.effective <= completion);
    if (boundary || (completion && completion > season.dateEnd.slice(0, 10)))
        return { key: null, seasonId: season.id, banRegime: null, status: 'straddles-boundary' };
    const regime = regimes.filter(r => r.format === format && r.effective <= date && r.through >= date).sort((a, b) => b.effective.localeCompare(a.effective))[0];
    return { key: JSON.stringify([format, season.id, regime?.id ?? 'unverified-bans']), seasonId: season.id, banRegime: regime?.id ?? null, status: regime ? 'verified' : 'unverified-bans' };
}
