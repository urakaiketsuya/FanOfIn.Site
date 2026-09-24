import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { DeckComment, DeckCommentTarget, DeckCommentThread } from "@gatcg/shared";
import { accountApi } from "../../lib/accountApi";
import Panel from "../../components/ui/Panel";
import Button from "../../components/ui/Button";

function CommentCard({ comment, target, signedIn, locked, onRefresh }: { comment: DeckComment; target: DeckCommentTarget; signedIn: boolean; locked: boolean; onRefresh: () => Promise<void> }) {
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const act = async (action: () => Promise<unknown>) => { setBusy(true); setNotice(null); try { await action(); await onRefresh(); } catch (error) { setNotice(error instanceof Error ? error.message : "Action failed"); } finally { setBusy(false); } };
  return <article id={`comment-${comment.id}`} className="scroll-mt-20 rounded-xl border border-ctp-surface1 bg-ctp-base p-3 sm:p-4">
    <div className="flex items-start justify-between gap-3"><div><Link to={`/users/${comment.author.profileSlug}`} className="text-sm font-semibold text-ctp-blue hover:underline">{comment.author.displayName}</Link><p className="mt-0.5 text-xs text-ctp-subtext0"><a href={`#comment-${comment.id}`} className="hover:text-ctp-blue">{new Date(comment.createdAt).toLocaleString()}</a>{comment.edited && !comment.deleted ? " · edited" : ""}</p></div></div>
    {comment.deleted ? <p className="mt-3 text-sm italic text-ctp-subtext0">Comment deleted.</p> : <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-ctp-text">{comment.body}</p>}
    {!comment.deleted && <div className="mt-2 flex flex-wrap gap-1">
      {signedIn && !locked && !comment.parentId && <button type="button" onClick={() => setReplying((value) => !value)} className="min-h-10 rounded-lg px-3 text-xs text-ctp-blue hover:bg-ctp-blue/10">Reply</button>}
      {comment.mine && <button type="button" disabled={busy} onClick={() => { const body = window.prompt("Edit comment", comment.body); if (body && body !== comment.body) void act(() => accountApi.editComment(comment.id, body)); }} className="min-h-10 rounded-lg px-3 text-xs text-ctp-subtext1 hover:bg-ctp-surface0">Edit</button>}
      {comment.mine && <button type="button" disabled={busy} onClick={() => { if (window.confirm("Delete this comment? Replies will remain visible.")) void act(() => accountApi.deleteComment(comment.id)); }} className="min-h-10 rounded-lg px-3 text-xs text-ctp-red hover:bg-ctp-red/10">Delete</button>}
      {signedIn && !comment.mine && <button type="button" disabled={busy} onClick={() => { const reason = window.prompt("Report reason: spam, abuse, harassment, or other")?.toLowerCase(); if (reason && ["spam", "abuse", "harassment", "other"].includes(reason)) void act(() => accountApi.reportComment(comment.id, reason as "spam" | "abuse" | "harassment" | "other")); }} className="min-h-10 rounded-lg px-3 text-xs text-ctp-subtext0 hover:bg-ctp-surface0">Report</button>}
      {signedIn && !comment.mine && <button type="button" disabled={busy} onClick={() => { if (window.confirm(`Block ${comment.author.displayName}? Their comments will be hidden for you.`)) void act(() => accountApi.setBlock(comment.author.profileSlug, true)); }} className="min-h-10 rounded-lg px-3 text-xs text-ctp-subtext0 hover:bg-ctp-surface0">Block</button>}
    </div>}
    {replying && <form className="mt-3" onSubmit={(event) => { event.preventDefault(); if (!reply.trim()) return; void act(() => accountApi.addDeckComment(target, reply, comment.id)).then(() => { setReply(""); setReplying(false); }); }}><label className="text-xs font-medium text-ctp-subtext1">Reply<textarea autoFocus rows={3} maxLength={2000} value={reply} onChange={(event) => setReply(event.target.value)} className="mt-1 block w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle p-3 text-sm text-ctp-text focus:border-ctp-blue focus:outline-none" /></label><div className="mt-2 flex gap-2"><Button type="submit" variant="primary" disabled={busy || !reply.trim()}>Post reply</Button><Button type="button" variant="secondary" onClick={() => setReplying(false)}>Cancel</Button></div></form>}
    {notice && <p role="status" className="mt-2 text-xs text-ctp-yellow">{notice}</p>}
    {comment.replies.length > 0 && <div className="mt-4 space-y-3 border-l-2 border-ctp-surface1 pl-3 sm:pl-5">{comment.replies.map((item) => <CommentCard key={item.id} comment={item} target={target} signedIn={signedIn} locked={locked} onRefresh={onRefresh} />)}</div>}
  </article>;
}

export default function DeckComments({ target }: { target: DeckCommentTarget }) {
  const stableTarget = useMemo<DeckCommentTarget>(() => ({ kind: target.kind, id: target.id } as DeckCommentTarget), [target.kind, target.id]);
  const [thread, setThread] = useState<DeckCommentThread | null>();
  const [signedIn, setSignedIn] = useState(false);
  const [sort, setSort] = useState<"oldest" | "newest">("oldest");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const refresh = useCallback(async () => { setThread(await accountApi.deckComments(stableTarget, sort)); }, [stableTarget, sort]);
  useEffect(() => { void accountApi.session().then(({ user }) => setSignedIn(Boolean(user))).catch(() => setSignedIn(false)); }, []);
  useEffect(() => { setThread(undefined); void refresh().catch((error) => { setNotice(error instanceof Error ? error.message : "Comments could not be loaded"); setThread(null); }); }, [refresh]);
  const act = async (action: () => Promise<unknown>) => { setBusy(true); setNotice(null); try { await action(); await refresh(); } catch (error) { setNotice(error instanceof Error ? error.message : "Action failed"); } finally { setBusy(false); } };
  return <section className="mt-10" aria-labelledby="deck-comments-heading">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="deck-comments-heading" className="text-xl font-semibold text-ctp-text">Deck discussion</h2><p className="mt-1 text-sm text-ctp-subtext1">Questions, ideas, and replies about this exact deck.</p></div>{thread && <select aria-label="Comment order" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="min-h-11 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 text-sm"><option value="oldest">Oldest first</option><option value="newest">Newest first</option></select>}</div>
    {thread?.canLock && <button type="button" disabled={busy} onClick={() => void act(() => accountApi.lockDeckComments(stableTarget, !thread.locked))} className="mt-3 min-h-11 rounded-lg border border-ctp-surface1 px-3 text-sm text-ctp-subtext1">{thread.locked ? "Unlock discussion" : "Lock discussion"}</button>}
    {thread?.locked ? <Panel tone="warning" padding="sm" className="mt-4 text-sm">This discussion is locked. Existing comments remain visible.</Panel> : signedIn ? <form className="mt-4" onSubmit={(event) => { event.preventDefault(); if (!body.trim()) return; void act(() => accountApi.addDeckComment(stableTarget, body)).then(() => setBody("")); }}><label className="text-sm font-medium">Add a comment<textarea rows={4} maxLength={2000} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Share a question or observation…" className="mt-1 block w-full rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3 text-sm focus:border-ctp-blue focus:outline-none" /></label><div className="mt-2 flex items-center justify-between gap-3"><span className="text-xs text-ctp-subtext0">{body.length}/2,000</span><Button type="submit" variant="primary" disabled={busy || !body.trim()}>Post comment</Button></div></form> : <Panel padding="sm" className="mt-4 text-sm text-ctp-subtext1"><Link to="/account" className="font-medium text-ctp-blue hover:underline">Sign in</Link> to join the discussion.</Panel>}
    {notice && <p role="status" className="mt-3 text-sm text-ctp-yellow">{notice}</p>}
    {thread === undefined ? <p className="mt-5 text-sm text-ctp-subtext0">Loading discussion…</p> : thread && thread.comments.length > 0 ? <div className="mt-5 space-y-3">{thread.comments.map((comment) => <CommentCard key={comment.id} comment={comment} target={stableTarget} signedIn={signedIn} locked={thread.locked} onRefresh={refresh} />)}</div> : <p className="mt-5 rounded-xl border border-dashed border-ctp-surface1 p-6 text-center text-sm text-ctp-subtext1">No comments yet. Start the conversation.</p>}
  </section>;
}
