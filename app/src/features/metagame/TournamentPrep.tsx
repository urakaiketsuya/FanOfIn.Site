import { Link } from 'react-router-dom';
import { EVENT_CATEGORY_LABELS, EVENT_CATEGORY_ORDER, type metaFreshness } from '@gatcg/shared';
import { CardIdentity } from '../events/EventReportVisuals';
import { useChampionCardImages } from '../players/useChampionCardImages';

type Prep = ReturnType<typeof metaFreshness>['tournamentPrep'];
const percent = (value: number) => `${value.toFixed(1)}%`;

export default function TournamentPrep({ prep, format, eventTier, onEventTier }: {
  prep: Prep;
  format: string;
  eventTier: string;
  onEventTier: (value: string) => void;
}) {
  const { likelyOpponents, worthTesting } = prep;
  const images = useChampionCardImages([...likelyOpponents, ...worthTesting].map(build => build.champion));
  const groups = [
    { title: 'Likely opponents', builds: likelyOpponents, empty: 'No classified decks in this scope.', testing: false },
    { title: 'Worth testing', builds: worthTesting, empty: 'No build scored above 50% with at least 20 recorded matches.', testing: true },
  ];

  return (
    <section aria-labelledby="tournament-prep-heading" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="tournament-prep-heading" className="text-xl font-semibold">Tournament prep</h2>
          <p className="mt-1 text-sm text-ctp-subtext1" role="status">
            {prep.decks.toLocaleString()} public decks · {prep.events.toLocaleString()} events
          </p>
        </div>
        <label className="min-w-0 text-sm sm:w-52">
          Event tier
          <select className="mt-1 block min-h-control w-full rounded border border-ctp-surface1 bg-ctp-base px-3 focus-visible:outline-2 focus-visible:outline-ctp-blue" value={eventTier} onChange={event => onEventTier(event.target.value)}>
            <option value="">All event tiers</option>
            {EVENT_CATEGORY_ORDER.map(tier => <option key={tier} value={tier}>{EVENT_CATEGORY_LABELS[tier]}</option>)}
          </select>
        </label>
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
