export { timelineVideoLink as matchVideoLink } from "@gatcg/shared";
import { timelineVideoLink, type BroadcastTimelineBeat, type BroadcastTimelineMatch } from "@gatcg/shared";

export function beatVideoLink(beat: BroadcastTimelineBeat, video: BroadcastTimelineMatch['video']) {
  const time = beat.timestamp;
  if (!time || !video || time.videoId !== video.id) return undefined;
  const link = timelineVideoLink({ ...video, startSeconds: time.seconds });
  if (!link) return undefined;
  const hours = Math.floor(time.seconds / 3600);
  const minutes = Math.floor(time.seconds / 60) % 60;
  const seconds = String(time.seconds % 60).padStart(2, '0');
  return { url: link.url, label: hours ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}` };
}
