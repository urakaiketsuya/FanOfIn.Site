import { useState } from 'react';
import { timelineMetadata, type BroadcastTimelineMatch } from '@gatcg/shared';
import Button from '../../components/ui/Button';

export default function MatchShare({ match }: { match: BroadcastTimelineMatch }) {
  const [status, setStatus] = useState('');
  const [failed, setFailed] = useState(false);
  const meta = timelineMetadata(match);
  async function copy() {
    try { await navigator.clipboard.writeText(meta.url); setFailed(false); setStatus('Link copied'); }
    catch { setFailed(true); setStatus('Copy this match link:'); }
  }
  async function share() {
    try { await navigator.share({ title: meta.title, url: meta.url }); setStatus(''); }
    catch (error) { if (!(error instanceof Error && error.name === 'AbortError')) await copy(); }
  }
  return <div className="flex min-w-0 flex-wrap items-center gap-2">
    <Button onClick={copy}>Copy link</Button>
    {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && <Button onClick={share}>Share match</Button>}
    <span role="status" className="text-sm text-ctp-subtext1">{status}</span>
    {failed && <input aria-label="Match link" readOnly value={meta.url} onFocus={event => event.currentTarget.select()} className="min-h-control w-full min-w-0 rounded border border-ctp-surface1 bg-ctp-base px-3 text-sm" />}
  </div>;
}
