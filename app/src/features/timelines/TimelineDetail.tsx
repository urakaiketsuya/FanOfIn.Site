import { Link, useParams } from "react-router-dom";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useTabParam } from "../../lib/useTabParam";
import PageLayout from "../../components/layout/PageLayout";
import Tabs from "../../components/ui/Tabs";
import { InlineState, EmptyState } from "../../components/ui/ContentState";
import { useBroadcastTimelineMatch, useBroadcastTimelines } from "./data";
import MatchTimeline, { MatchTimelineHeader } from "./MatchTimeline";
import MatchDecklists from "./MatchDecklists";

type DetailTab = "timeline" | "decklists";
const ALL_DETAIL_TABS: DetailTab[] = ["timeline", "decklists"];

export default function TimelineDetail() {
  const { id } = useParams<{ id: string }>();
  const data = useBroadcastTimelines();
  const match = useBroadcastTimelineMatch(id);
  const [tab, setTab] = useTabParam("tab", ALL_DETAIL_TABS, "timeline");

  useDocumentTitle(
    match ? `${match.event} — ${match.round}` : "Match Timeline",
    "Experimental — reconstructed from broadcast VOD commentary.",
  );

  const tabs: { key: DetailTab; label: string }[] = [{ key: "timeline", label: "Timeline" }];
  if (match?.eventId !== undefined) tabs.push({ key: "decklists", label: "Decklists" });
  const activeTab = tabs.some((t) => t.key === tab) ? tab : "timeline";

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
          <MatchTimelineHeader match={match} />

          {tabs.length > 1 && (
            <div className="mt-4">
              <Tabs tabs={tabs} active={activeTab} onChange={setTab} label="Match view" />
            </div>
          )}

          <div className="mt-4">
            {activeTab === "timeline" && <MatchTimeline match={match} />}
            {activeTab === "decklists" && <MatchDecklists match={match} />}
          </div>
        </>
      )}
    </PageLayout>
  );
}
