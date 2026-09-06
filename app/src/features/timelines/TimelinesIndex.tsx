import { Link } from "react-router-dom";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageLayout from "../../components/layout/PageLayout";
import Panel from "../../components/ui/Panel";
import { InlineState, EmptyState } from "../../components/ui/ContentState";
import BroadcastDataNotice from "../../components/BroadcastDataNotice";
import { useBroadcastTimelines } from "./data";

export default function TimelinesIndex() {
  useDocumentTitle("Match Timelines", "Experimental — feature matches reconstructed from broadcast VOD commentary.");
  const data = useBroadcastTimelines();

  return (
    <PageLayout data-component="TimelinesIndex">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-ctp-blue">Match Timelines</h1>
          <p className="mt-1 text-sm text-ctp-subtext1">
            Feature matches from broadcast VODs, reconstructed beat-by-beat from caster commentary — a small,
            hand-curated set of matches, not a comprehensive dataset.
          </p>
        </div>
        <Link to="/timelines/combos" className="shrink-0 text-sm font-medium text-ctp-blue hover:underline">
          Browse notable combos &rarr;
        </Link>
      </div>

      <div className="mt-4 rounded-lg border border-ctp-peach bg-ctp-peach/10 px-4 py-3 text-sm text-ctp-text">
        <p className="font-semibold text-ctp-peach">Experimental — commentary-derived, not tournament data</p>
        <BroadcastDataNotice className="mt-1 text-sm text-ctp-subtext1" />
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
