import { Link, useParams } from "react-router-dom";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageLayout from "../../components/layout/PageLayout";
import { InlineState, EmptyState } from "../../components/ui/ContentState";
import { useBroadcastTimelineMatch, useBroadcastTimelines } from "./data";
import MatchTimeline from "./MatchTimeline";

export default function TimelineDetail() {
  const { id } = useParams<{ id: string }>();
  const data = useBroadcastTimelines();
  const match = useBroadcastTimelineMatch(id);

  useDocumentTitle(
    match ? `${match.event} — ${match.round}` : "Match Timeline",
    "Experimental — reconstructed from broadcast VOD commentary.",
  );

  return (
    <PageLayout width="standard">
      {!data && <InlineState>Loading…</InlineState>}
      {data && !match && (
        <EmptyState
          title="Timeline not found"
          description="This match timeline may have been removed or the link is out of date."
          action={
            <Link to="/timelines" className="text-sm font-medium text-ctp-blue hover:underline">
              Back to Match Timelines
            </Link>
          }
        />
      )}
      {match && (
        <>
          <Link to="/timelines" className="mb-4 inline-block text-sm text-ctp-subtext1 hover:text-ctp-blue hover:underline">
            &larr; Match Timelines
          </Link>
          <MatchTimeline match={match} />
        </>
      )}
    </PageLayout>
  );
}
