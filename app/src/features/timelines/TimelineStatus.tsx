import Button from "../../components/ui/Button";
import { usePublishedDataStatus } from "../../lib/sync/usePublishedData";

export default function TimelineStatus({ loading = false }: { loading?: boolean }) {
  const status = usePublishedDataStatus("broadcast-timelines", "/data/broadcast-timelines.json");
  return status.error ? <div role="alert" className="my-4 flex flex-wrap items-center gap-3 text-sm text-ctp-red"><span>Couldn’t refresh match recaps.</span><Button onClick={status.retry}>Retry</Button></div> : loading ? <p className="my-4 text-sm text-ctp-subtext1" role="status">Loading match recaps…</p> : null;
}
