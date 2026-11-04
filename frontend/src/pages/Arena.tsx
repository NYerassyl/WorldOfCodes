import { useEffect, useState, useSyncExternalStore } from "react";
import { io } from "socket.io-client";
import { useAuth, getToken, setToken } from "../lib/auth";
import { BattleSession } from "../lib/battle-session";
import type { BattleMatch } from "../lib/battle-api";
import { Heading, Editor, Notice, Icon } from "../components/UI";
import "../components/battle/battle.css";

export default function Arena({ friendly = false }: { friendly?: boolean }) {
  const auth = useAuth();
  const token = getToken();
  if (auth.status === "loading") return <Notice>Restoring your session…</Notice>;
  if (auth.status !== "authenticated" || !auth.user || !token) return <>
    <Heading title={friendly ? "Bring a friend." : "Meet your next challenge."} description="Real opponents. One Python problem. Results recorded by the server." />
    <section className="panel battle-signin">
      <Icon name={friendly ? "friends" : "duel"} />
      <h2>Sign in to enter the arena.</h2>
      <p>Your account connects you to live matchmaking and your saved battle results. Learning XP and coins stay separate from battle rating.</p>
      <a className="btn" href="#profile">Go to account</a>
      {auth.status === "unavailable" && <button className="btn secondary" onClick={() => void auth.retry()}>Retry session</button>}
    </section>
  </>;
  return <BattleRuntime key={`${auth.user.id}:${token}`} friendly={friendly} userId={auth.user.id} token={token} />;
}
function BattleRuntime({ friendly, userId, token }: { friendly: boolean; userId: string; token: string }) {
  const { retry } = useAuth();
  const [session, setSession] = useState<BattleSession | null>(null);
  useEffect(() => {
    const env = (import.meta as ImportMeta & { env?: Record<string, string | boolean> }).env;
    // Production uses the same origin. Local Vite only proxies /api, so connect to the shared dev server directly.
    const socketUrl = typeof env?.VITE_BATTLE_SOCKET_URL === "string" ? env.VITE_BATTLE_SOCKET_URL
      : env?.DEV ? `${location.protocol}//${location.hostname}:4001` : undefined;
    const socket = io(socketUrl, { autoConnect: false, forceNew: true, auth: { token }, timeout: 8000, reconnectionAttempts: 8 });
    let storage: Storage | null = null;
    try { storage = localStorage; } catch { /* Private browsing may deny storage. */ }
    const next = new BattleSession({ userId, socket, storage, onExpired: () => {
      setToken(null);
      void retry();
    } });
    setSession(next);
    next.start();
    return () => next.stop();
  }, [userId, token, retry]);
  return session ? <BattleView session={session} friendly={friendly} userId={userId} /> : <Notice>Connecting to the arena…</Notice>;
}
function Players({ match, userId }: { match: BattleMatch; userId: string }) {
  return <div className="battle-players" aria-label="Match participants">
    {match.players.map(player => <div className="battle-player" key={player.userId}>
      <span className="avatar small" aria-hidden="true">{player.user.nickname.slice(0, 1).toUpperCase()}</span>
      <div><strong>{player.user.nickname}</strong><small>{player.userId === userId ? "You" : "Opponent"}</small></div>
      <div className="battle-player-result">
        <span>{player.verdict?.replaceAll("_", " ") ?? "No accepted submission"}</span>
        {match.type === "RANKED" && match.status === "COMPLETED" && <strong>
          {player.ratingDelta === null || player.ratingDelta === undefined ? "Rating pending" : `${player.ratingDelta > 0 ? "+" : ""}${player.ratingDelta} rating`}
        </strong>}
      </div>
    </div>)}
    {match.players.length < 2 && <div className="battle-player"><span className="avatar small ghost">?</span><div><strong>Waiting for your friend</strong><small>Share your invitation code</small></div></div>}
  </div>;
}
function BattleView({ session, friendly, userId }: { session: BattleSession; friendly: boolean; userId: string }) {
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const [inviteCode, setInviteCode] = useState("");
  const [restoreId, setRestoreId] = useState("");
  const [copied, setCopied] = useState("");
  const { match, problem, busy } = state;
  const locked = Boolean(busy);
  const terminal = Boolean(match && !["ACTIVE", "PENDING"].includes(match.status));
  const me = match?.players.find(player => player.userId === userId);
  const canSubmit = match?.status === "ACTIVE" && problem && !locked && !me?.submittedAt && Boolean(state.code.trim()) && state.code.length <= 20000;
  const copyInvite = async () => {
    try { await navigator.clipboard.writeText(state.invite!.inviteCode); setCopied("Invitation code copied."); }
    catch { setCopied("Clipboard unavailable. Select the invitation code and copy it manually."); }
  };
  const resultHeading = match?.status === "COMPLETED"
    ? match.winnerId ? `${match.players.find(player => player.userId === match.winnerId)?.user.nickname ?? "A player"} won.` : "Match completed. No winner recorded."
    : match?.status === "EXPIRED" ? "This invitation has expired." : "This match was cancelled.";
  return <div className="battle-page">
    <Heading title={match ? (match.type === "FRIENDLY" ? "A friendly rivalry." : "The arena is yours.") : friendly ? "Better with a rival." : "Meet your next challenge."}
      description={match ? "Server-verified Python battles. No client-calculated results." : friendly ? "Invite a friend. Same problem, no rating at stake." : "One opponent. One problem. Your best thinking."}>
      <div className="battle-connection" role="status"><span className={`battle-dot ${state.connection}`} />
        {state.connection === "online" ? "Live connection" : state.connection === "connecting" ? "Connecting…" : state.connection === "reconnecting" ? "Reconnecting…" : "Live connection offline"}
        {state.connection !== "online" && <button className="battle-text-button" onClick={session.reconnect}>Retry</button>}
      </div>
    </Heading>
    {state.error && <div className="battle-error" role="alert"><span>{state.error}</span><button onClick={session.dismissError} aria-label="Dismiss battle error">×</button></div>}
    {state.notice && <div className="notice" role="status">{state.notice}</div>}
    {state.connection !== "online" && state.matchId && <Notice>Connection interrupted. We will keep checking this match over HTTP. An opponent disconnect does not imply a win.</Notice>}
    {state.matchId && !match && <section className="panel" aria-busy="true">
      <h2>Restoring the server match…</h2><p>Match ID: <code className="battle-id">{state.matchId}</code></p>
      <div className="inline-actions"><button className="btn secondary" onClick={() => void session.refresh()}>Retry match</button>
      <button className="battle-text-button" disabled={locked} onClick={session.clearMatch}>Clear unavailable saved reference</button></div>
    </section>}
    {match && <>
      <div className="battle-match-meta"><span className="eyebrow">{match.type} · {match.status}</span>
        <span>Match ID: <code className="battle-id">{match.id}</code></span>
        <button className="battle-text-button" onClick={() => void session.refresh()}>Refresh server state</button>
      </div>
      <Players match={match} userId={userId} />
      {match.type === "FRIENDLY" && <Notice>Friendly match: no rating changes. Battle results do not award learning XP or coins.</Notice>}
      {match.status === "PENDING" && <section className="panel battle-invite-panel">
        <span className="eyebrow">WAITING FOR PLAYER TWO</span><h2>Your friend has a seat.</h2>
        {state.invite ? <><p>Share this private invitation. Invitations last 30 minutes from creation and can only be used once.</p>
          <label htmlFor="battle-share-code">Invitation code</label><div className="battle-input-row">
            <input id="battle-share-code" readOnly value={state.invite.inviteCode} onFocus={event => event.currentTarget.select()} />
            <button className="btn secondary" onClick={() => void copyInvite()}>Copy code</button>
          </div><p role="status" className="muted">{copied || "The match starts when your friend joins."}</p></>
          : <p>Waiting for the second player. If you created this invitation in another browser, use the code shown there.</p>}
        <Notice>Keep this match ID to restore it later. Closing the page does not cancel the invitation. Expiry is confirmed by the server when an invite is used.</Notice>
      </section>}
      {terminal && <section className="battle-result" role="status"><span className="eyebrow">SERVER RESULT</span><h2>{resultHeading}</h2>
        <p>{match.type === "FRIENDLY" ? "Your rating is unchanged." : "Rating changes above are read from the settled match."}</p>
        <button className="btn" disabled={locked} onClick={session.clearMatch}>Back to matchmaking</button>
      </section>}
      {match.status === "ACTIVE" && <div className="two-cols battle-workspace">
        <section className="panel" aria-busy={!problem}>
          {problem ? <><span className={`difficulty ${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
            <h2>{problem.title}</h2><p className="battle-statement">{problem.statement}</p>
            <h3>Public examples</h3>{problem.testCases.map((sample, index) => <pre className="code" key={index}>Arguments: {sample.argsJson}{"\n"}Returns: {sample.expectedJson}</pre>)}
            <Notice>Write the complete <code>{problem.functionName}</code> Python function. Return the result, do not read stdin. Hidden tests stay on the server.</Notice>
          </> : <><h2>Loading the problem…</h2><p>The starter function comes from the public problem API.</p><button className="btn secondary" onClick={() => void session.refresh()}>Retry problem</button></>}
        </section>
        <section className="battle-solution" aria-label="Python solution">
          <Editor title="solution.py · Python" value={state.code} onChange={session.setCode} placeholder="Loading the server starter function…" />
          <div className="inline-actions"><button className="btn" disabled={!canSubmit} onClick={() => void session.submit()}>{busy === "submit" ? "Judging…" : "Submit full function"}</button><small className="muted">{state.code.length.toLocaleString()} / 20,000 characters</small></div>
          {state.verdict && <div className="battle-verdict" role="status"><strong>{state.verdict.status.replaceAll("_", " ")}</strong><span>{state.verdict.passedCases} / {state.verdict.totalCases} tests passed</span><p>{state.verdict.status === "ACCEPTED" ? "Checking the authoritative match result…" : "Edit your function and try again while this match is active."}</p></div>}
          <p className="muted battle-presence">Opponent presence is not reported by this server. The match only ends when the server records a result.</p>
        </section>
      </div>}
      {state.syncedAt && <p className="muted battle-sync">Last server check: {new Date(state.syncedAt).toLocaleTimeString("en-GB")}. Known matches refresh every 2.5 seconds.</p>}
    </>}
    {!state.matchId && <div className="two-cols">
      <section className="panel">
        <span className="eyebrow">{friendly ? "FRIENDLY MATCH" : "RANKED · 1 VS 1"}</span>
        <div className="arena-stage"><div className="arena-symbol"><Icon name={friendly ? "friends" : "duel"} /></div>
          <h2>{friendly ? "A little friendly competition." : "One problem. Your best thinking."}</h2>
          <p className="muted">{friendly ? "Bring someone who makes you think." : "The first accepted solution wins. The server settles the rating."}</p>
        </div>
        <div className="battle-rating"><span>Your server rating</span><strong>{state.rating?.points ?? "…"}</strong><small>{state.rating ? `${state.rating.wins} wins · ${state.rating.losses} losses · ${state.rating.draws} draws` : "Loading from your account"}</small></div>
        <Notice>No topic filters, spectator access or beginner rating protection in this version. Python functions only.</Notice>
      </section>
      <section className="panel battle-controls">
        {state.queue !== "idle" ? <><span className="eyebrow">{state.queue === "queued" ? "MATCHMAKING" : "QUEUE UNCONFIRMED"}</span><h2>{state.queue === "queued" ? "Finding your next rival…" : "Check your queue connection."}</h2>
          <p>Keep this page open. Cancel before switching modes or trying again.</p><button className="btn secondary" disabled={locked} onClick={() => void session.leaveRanked()}>{busy === "leave" ? "Cancelling…" : "Cancel queue"}</button>
        </> : friendly ? <><h2>Invite or join.</h2><p>Create a one-use code for a private match.</p><button className="btn" disabled={locked} onClick={() => void session.createInvite()}>{busy === "invite" ? "Creating invitation…" : "Create invitation"}</button>
          <div className="battle-divider">or join a friend</div>
          <form onSubmit={event => { event.preventDefault(); void session.joinInvite(inviteCode); }}>
            <label htmlFor="battle-invite-code">Invitation code</label><input id="battle-invite-code" value={inviteCode} onChange={event => setInviteCode(event.target.value)} autoComplete="off" autoCapitalize="characters" maxLength={128} required />
            <button className="btn secondary" disabled={locked || !inviteCode.trim()}>{busy === "join" ? "Joining…" : "Join invitation"}</button>
          </form>
        </> : <><h2>Ready when you are.</h2><p>Join the shared queue. Both players receive the same server-selected problem.</p>
          <button className="btn" disabled={locked || state.connection !== "online"} onClick={() => void session.joinRanked()}>{busy === "queue" ? "Joining queue…" : "Find ranked opponent"}</button>
          <p className="muted">Queue positions expire after about a minute. A lost acknowledgement is never treated as a confirmed match.</p>
        </>}
        <a className="battle-mode-link" href={friendly ? "#duel" : "#friends"}>{friendly ? "Go to ranked arena" : "Play a friendly match"} <Icon name="arrow" /></a>
        <details className="battle-recovery"><summary>Restore a match by ID</summary><p>Known match IDs restore automatically in this browser. If a pairing notification was missed, the current server needs the match ID to recover it.</p>
          <form onSubmit={event => { event.preventDefault(); void session.recoverMatch(restoreId); }}><label htmlFor="battle-restore-id">Match ID</label><input id="battle-restore-id" value={restoreId} onChange={event => setRestoreId(event.target.value)} required maxLength={128} /><button className="btn secondary" disabled={locked || !restoreId.trim() || state.queue !== "idle"}>Restore match</button></form>
        </details>
      </section>
    </div>}
  </div>;
}
