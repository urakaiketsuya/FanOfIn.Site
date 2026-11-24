import { Link } from 'react-router-dom';
import { EVENT_CATEGORY_LABELS, EVENT_CATEGORY_ORDER, type metaFreshness } from '@gatcg/shared';
import DisclosureChevron from '../../components/DisclosureChevron';
import Button from '../../components/ui/Button';
import { CardIdentity } from '../events/EventReportVisuals';
import { useChampionCardImages } from '../players/useChampionCardImages';

type Prep = ReturnType<typeof metaFreshness>['tournamentPrep'];
type PrepGroup = {
  title: string;
  builds: (Prep['likelyOpponents'][number] | Prep['worthTesting'][number])[];
  empty: string;
  testing: boolean;
};
const percent = (value: number) => `${value.toFixed(1)}%`;

export default function TournamentPrep({ prep, format, eventTiers, onEventTiersChange }: {
  prep: Prep;
  format: string;
  eventTiers: string[];
  onEventTiersChange: (tiers: string[]) => void;
}) {
  const tierSummary = eventTiers.length
    ? eventTiers.map(tier => EVENT_CATEGORY_LABELS[tier]).join(', ')
    : 'All event tiers';
  const { likelyOpponents, worthTesting } = prep;
  const images = useChampionCardImages([...likelyOpponents, ...worthTesting].map(build => build.champion));
  const groups: PrepGroup[] = [
    { title: 'Likely opponents', builds: likelyOpponents, empty: 'No classified decks in this scope.', testing: false },
    { title: 'Worth testing', builds: worthTesting, empty: 'No build scored above 50% with at least 20 recorded matches.', testing: true },
  ];

  return (
    <section aria-labelledby="tournament-prep-heading" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="tournament-prep-heading" className="text-xl font-semibold">Tournament prep</h2>
          <p className="mt-1 text-sm text-ctp-subtext1" role="status">
            {prep.decks.toLocaleString()} public decks · {prep.events.toLocaleString()} events
          </p>
        </div>
        <details className="group min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-base sm:w-80">
          <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ctp-blue [&::-webkit-details-marker]:hidden">
            <span className="min-w-0">
              <span className="block font-semibold">Event tiers</span>
              <span className="block break-words text-ctp-subtext1">{tierSummary}</span>
            </span>
            <DisclosureChevron className="group-open:rotate-180" />
          </summary>
          <div className="border-t border-ctp-surface1 p-2">
            <fieldset>
              <legend className="sr-only">Event tiers</legend>
              {EVENT_CATEGORY_ORDER.map(tier => {
                const checked = eventTiers.includes(tier);
                return (
                  <label key={tier} className="flex min-h-control cursor-pointer items-center gap-3 rounded px-3 text-sm hover:bg-ctp-mantle">
                    <input
                      type="checkbox"
                      checked={checked}
                      className="size-5 accent-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue"
                      onChange={event => onEventTiersChange(event.target.checked
                        ? [...eventTiers, tier]
                        : eventTiers.filter(selected => selected !== tier))}
                    />
                    {EVENT_CATEGORY_LABELS[tier]}
                  </label>
                );
              })}
            </fieldset>
            <Button variant="ghost" aria-disabled={eventTiers.length === 0} onClick={() => {
              if (eventTiers.length) onEventTiersChange([]);
            }}>Reset to all tiers</Button>
          </div>
        </details>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {groups.map(({ title, builds, empty, testing }) => (
          <div key={title} className="min-w-0 space-y-2">
            <h3 className="font-semibold">{title}</h3>
            {builds.length === 0 ? <p className="text-sm text-ctp-subtext1">{empty}</p> : (
              <ul className="grid gap-2">
                {builds.map(build => {
                  const hasExactReport = format === 'standard' && !!build.deckHash;
                  const deckUrl = hasExactReport && build.deckHash
                    ? `/decks/${encodeURIComponent(build.deckHash)}?tab=performance`
                    : `/archetypes/${encodeURIComponent(build.id)}?tab=report`;
                  const reportLabel = hasExactReport ? 'Deck report' : 'Build report';
                  return (
                    <li key={build.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)] items-center gap-2 rounded-xl bg-ctp-mantle p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <div className="min-w-0 space-y-2">
                        <CardIdentity name={build.champion} card={images.get(build.champion)} />
                        <p className="break-words text-sm font-semibold">{build.name}</p>
                        <p className="text-sm text-ctp-subtext1">
                          {testing ? `${percent(build.adjustedScore * 100)} adjusted match score · ${build.matches.toLocaleString()} matches` : `${percent(build.share)} of public lists · ${build.count.toLocaleString()} decks`}
                        </p>
                        {'matchesByTier' in build && (
                          <ul aria-label="Matches by event tier" className="flex flex-wrap gap-2">
                            {build.matchesByTier.map(({ tier, matches }) => (
                              <li key={tier} className="rounded-md bg-ctp-surface0 px-2 py-1 text-xs text-ctp-text">
                                {EVENT_CATEGORY_LABELS[tier] ?? tier} <strong className="tabular-nums">{matches.toLocaleString()}</strong>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <Link to={deckUrl} aria-label={`${build.name} ${reportLabel}`} className="inline-flex min-h-control items-center justify-center rounded-lg border border-ctp-surface1 px-3 text-sm font-semibold text-ctp-blue hover:bg-ctp-surface0 focus-visible:outline-2 focus-visible:outline-ctp-blue">
                        {reportLabel}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
