import { timelineMetadata } from "@gatcg/shared";
import MatchShare from "./MatchShare";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useTabParam } from "../../lib/useTabParam";
import PageLayout from "../../components/layout/PageLayout";
import Tabs, { TabPanel } from "../../components/ui/Tabs";
import { EmptyState } from "../../components/ui/ContentState";
import { useBroadcastTimelineMatch, useBroadcastTimelines } from "./data";
import MatchTimeline, { MatchTimelineHeader } from "./MatchTimeline";
import MatchDecklists from "./MatchDecklists";
import MatchVideoLink from "./MatchVideoLink";
import TimelineStatus from "./TimelineStatus";

type DetailTab = "timeline" | "decklists";
const ALL_DETAIL_TABS: DetailTab[] = ["timeline", "decklists"];

export default function TimelineDetail() {
  const { id } = useParams<{ id: string }>();
  const data = useBroadcastTimelines();
  const match = useBroadcastTimelineMatch(id);
  const [tab, setTab] = useTabParam("tab", ALL_DETAIL_TABS, "timeline");

  const metadata = match ? timelineMetadata(match) : undefined;
  useDocumentTitle(metadata?.title ?? "Match Timeline", metadata?.description ?? "Players, cards and key moments from the broadcast.", metadata?.path, metadata ? { src: metadata.image, alt: metadata.title } : undefined);

  const tabs: { key: DetailTab; label: string }[] = [{ key: "timeline", label: "Timeline" }];
  if (match?.eventId !== undefined) tabs.push({ key: "decklists", label: "Decklists" });
  const [decklistsVisited, setDecklistsVisited] = useState(tab === "decklists");
  const activeTab = tabs.some((t) => t.key === tab) ? tab : "timeline";

  return (
    <PageLayout data-component="TimelineDetail" width="fluid">
      <TimelineStatus loading={!data} />
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
          <Link to="/timelines" className="mb-4 inline-flex min-h-control items-center text-sm text-ctp-subtext1 hover:text-ctp-blue hover:underline">
            &larr; Match Timelines
          </Link>
          <MatchTimelineHeader match={match} />
          <div className="mt-4 flex flex-wrap items-center gap-3"><MatchVideoLink match={match} /><MatchShare key={match.id} match={match} /></div>

          <div className="mt-4">
              <Tabs baseId="match-view" variant="pill" tabs={tabs} active={activeTab} onChange={next => { if (next === "decklists") setDecklistsVisited(true); setTab(next); }} label="Match view" />
            </div>

          <div className="mt-4">
            <TabPanel baseId="match-view" tab="timeline" active={activeTab} keepMounted><MatchTimeline match={match} /></TabPanel>
            {tabs.length > 1 && (decklistsVisited || activeTab === "decklists") && <TabPanel baseId="match-view" tab="decklists" active={activeTab} keepMounted><MatchDecklists match={match} /></TabPanel>}
          </div>
        </>
      )}
    </PageLayout>
  );
}
