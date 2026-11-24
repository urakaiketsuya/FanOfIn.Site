import { Link } from 'react-router-dom';
import type { metaFreshness } from '@gatcg/shared';
import { CardIdentity } from '../events/EventReportVisuals';
import { useChampionCardImages } from '../players/useChampionCardImages';

type Report = ReturnType<typeof metaFreshness>;
const percent = (value: number) => `${value.toFixed(1)}%`;

export default function TournamentPrep({ report, format }: { report: Report; format: string }) {
  const { likelyOpponents, worthTesting } = report.tournamentPrep;
  const images = useChampionCardImages([...likelyOpponents, ...worthTesting].map(build => build.champion));
  const groups = [
    { title: 'Likely opponents', builds: likelyOpponents, empty: 'No classified decks in this scope.', testing: false },
    { title: 'Worth testing', builds: worthTesting, empty: 'No build scored above 50% with at least 20 recorded matches.', testing: true },
  ];

  return (
    <section aria-labelledby="tournament-prep-heading" className="space-y-4">
      <div>
        <h2 id="tournament-prep-heading" className="text-xl font-semibold">Tournament prep</h2>
        <p className="mt-1 text-sm text-ctp-subtext1">
          {report.current.decks.toLocaleString()} public decks · {report.current.events.toLocaleString()} events
        </p>
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
