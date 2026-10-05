import DisclosureChevron from '../../components/DisclosureChevron';

/** Evidence describes the calculation source, never a confidence score. */
export default function ResultEvidence({ kind, basis }: { kind: 'calculated' | 'modeled'; basis: string }) {
  return <div className="rounded-xl border border-ctp-surface1 p-3 text-sm">
    <p className="font-semibold">{kind === 'calculated' ? 'Calculated from your deck' : 'Modeled estimate'}</p>
    <p className="mt-1 text-ctp-subtext1">{basis}</p>
    <details className="group mt-1">
      <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-2 rounded focus-visible:outline-2 focus-visible:outline-ctp-blue">What supports this result?<DisclosureChevron /></summary>
      <dl className="space-y-3 text-ctp-subtext1">
        <div><dt className="font-medium text-ctp-text">Calculated</dt><dd>Draw probabilities use the listed Main Deck quantities and a randomly shuffled deck. They are exact for the stated draw assumptions, rounded for display. They measure access, not wins or successful plays.</dd></div>
        <div><dt className="font-medium text-ctp-text">Modeled</dt><dd>Draw effects, routes, and resource ceilings add assumptions about what can happen in play. Read their limits before comparing estimates.</dd></div>
        <div><dt className="font-medium text-ctp-text">Recorded games</dt><dd>Recorded-game evidence is not connected to these results. These percentages are not measured success rates or sample confidence intervals.</dd></div>
      </dl>
    </details>
  </div>;
}
