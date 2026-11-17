import { useEffect, useState, type FormEvent } from 'react';
import { useAuth, authErrorMessage } from '../lib/auth';
import * as api from '../lib/learning-api';
import './problem-comments.css';

export function ProblemComments({ problemId }: { problemId: string }) {
  const { user } = useAuth();
  const [page, setPage] = useState<api.CommentPage>();
  const [body, setBody] = useState('');
  const [editing, setEditing] = useState<string>();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setPage(undefined);
    setError('');
    api.comments(problemId, undefined, controller.signal)
      .then(setPage)
      .catch(e => { if (!controller.signal.aborted) setError(authErrorMessage(e)); });
    return () => controller.abort();
  }, [problemId, user?.id, version]);

  async function publish(event: FormEvent) {
    event.preventDefault();
    if (!user || !body.trim()) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await api.createComment(problemId, body.trim());
      setBody(''); setNotice('Comment posted.'); setVersion(v => v + 1);
    } catch (e) { setError(authErrorMessage(e)); }
    finally { setBusy(false); }
  }
  async function save(commentId: string) {
    setBusy(true); setError(''); setNotice('');
    try {
      const updated = await api.updateComment(problemId, commentId, draft.trim());
      setPage(p => p && ({ ...p, comments: p.comments.map(c => c.id === commentId ? updated : c) }));
      setEditing(undefined); setNotice('Comment updated.');
    } catch (e) { setError(authErrorMessage(e)); }
    finally { setBusy(false); }
  }
  async function remove(commentId: string) {
    setBusy(true); setError(''); setNotice('');
    try {
      await api.deleteComment(problemId, commentId);
      setNotice('Comment deleted.'); setVersion(v => v + 1);
    } catch (e) { setError(authErrorMessage(e)); }
    finally { setBusy(false); }
  }
  async function more() {
    if (!page?.nextCursor) return;
    setBusy(true); setError('');
    try {
      const next = await api.comments(problemId, page.nextCursor);
      setPage(p => p && ({ comments: [...p.comments, ...next.comments.filter(c => !p.comments.some(old => old.id === c.id))], nextCursor: next.nextCursor }));
    } catch (e) { setError(authErrorMessage(e)); }
    finally { setBusy(false); }
  }
  return (
    <section className="panel problem-comments" aria-labelledby="problem-comments-title">
      <div className="section-head"><h2 id="problem-comments-title">Discussion</h2></div>
      <p className="muted">Discuss this problem. Comments stay with this challenge.</p>
      {user ? (
        <form onSubmit={publish} className="comment-form">
          <label htmlFor="new-comment">Your comment</label>
          <textarea id="new-comment" value={body} maxLength={2000} rows={3}
            onChange={e => setBody(e.target.value)} disabled={busy} required />
          <div className="inline-actions">
            <button className="btn" disabled={busy || !body.trim()}>Post comment</button>
            <small>{body.length}/2000</small>
          </div>
        </form>
      ) : <p><a href="#profile">Sign in</a> to join the discussion.</p>}
      {error && <div role="alert" className="result error">{error} <button className="btn secondary" disabled={busy} onClick={() => setVersion(v => v + 1)}>Reload discussion</button></div>}
      {notice && <p role="status">{notice}</p>}
      {!page && !error && <p role="status">Loading discussion…</p>}
      {page?.comments.length === 0 && <p>No comments yet. Start the discussion.</p>}
      <div className="comment-list">
        {page?.comments.map(comment => (
          <article className="problem-comment" key={comment.id} data-comment-id={comment.id}>
            <div className="comment-meta">
              <strong>{comment.author.nickname}</strong>
              <time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString()}</time>
              {comment.updatedAt !== comment.createdAt && <small>Edited</small>}
            </div>
            {editing === comment.id ? (
              <form onSubmit={e => { e.preventDefault(); void save(comment.id); }} className="comment-form">
                <label htmlFor={`edit-${comment.id}`}>Edit comment</label>
                <textarea id={`edit-${comment.id}`} value={draft} onChange={e => setDraft(e.target.value)} maxLength={2000} rows={3} disabled={busy} required />
                <div className="inline-actions">
                  <button className="btn" disabled={busy || !draft.trim()}>Save comment</button>
                  <button type="button" className="btn secondary" disabled={busy} onClick={() => setEditing(undefined)}>Cancel</button>
                </div>
              </form>
            ) : <p className="comment-body">{comment.body}</p>}
            {user?.id === comment.author.id && editing !== comment.id && (
              <div className="inline-actions">
                <button className="btn secondary" disabled={busy} onClick={() => { setDraft(comment.body); setEditing(comment.id); setError(''); }}>Edit comment</button>
                <button className="btn secondary" disabled={busy} onClick={() => void remove(comment.id)}>Delete comment</button>
              </div>
            )}
          </article>
        ))}
      </div>
      {page?.nextCursor && <button className="btn secondary" disabled={busy} onClick={() => void more()}>Load older comments</button>}
    </section>
  );
}
