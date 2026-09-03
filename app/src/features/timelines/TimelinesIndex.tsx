import { Link } from "react-router-dom";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageLayout from "../../components/layout/PageLayout";
import Panel from "../../components/ui/Panel";
import { InlineState, EmptyState } from "../../components/ui/ContentState";
import { useBroadcastTimelines } from "./data";

export default function TimelinesIndex() {
  useDocumentTitle("Match Timelines", "Experimental — feature matches reconstructed from broadcast VOD commentary.");
  const data = useBroadcastTimelines();

  return (
    <PageLayout>
      <h1 className="text-2xl font-bold text-ctp-blue">Match Timelines</h1>
      <p className="mt-1 text-sm text-ctp-subtext1">
        Feature matches from broadcast VODs, reconstructed beat-by-beat from caster commentary — a small, hand-curated
        set of matches, not a comprehensive dataset.
      </p>

      <div className="mt-4 rounded-lg border border-ctp-peach bg-ctp-peach/10 px-4 py-3 text-sm text-ctp-text">
        <p className="font-semibold text-ctp-peach">Experimental — commentary-derived, not tournament data</p>
        <p className="mt-1 text-ctp-subtext1">
          Card names and life totals here are as called by broadcast casters and may contain transcription errors.
          This is a genuinely different population from tournament results shown elsewhere on the site — it is never
          blended into win rates, Elo, or Card Impact numbers.
        </p>
      </div>

      {!data && <InlineState className="mt-6">Loading…</InlineState>}

      {data && data.matches.length === 0 && (
        <EmptyState className="mt-6" title="No timelines published yet" />
      )}

      {data && data.matches.length > 0 && (
        <div className="mt-6 space-y-3">
          {data.matches.map((match) => (
            <Link key={match.id} to={`/timelines/${match.id}`} className="block">
              <Panel elevation={1} padding="md" className="transition hover:bg-ctp-surface1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-ctp-text">
                    {match.event} — {match.round}
                  </span>
                  <span className="text-sm text-ctp-subtext1">{match.result}</span>
                </div>
                <p className="mt-1 text-sm text-ctp-subtext1">
                  <span className="text-ctp-blue">{match.players[0].name}</span> ({match.players[0].deck}) vs.{" "}
                  <span className="text-ctp-mauve">{match.players[1].name}</span> ({match.players[1].deck})
                </p>
              </Panel>
            </Link>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
