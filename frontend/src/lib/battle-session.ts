import { ApiError } from "./api";
import * as api from "./battle-api";
import type { BattleMatch, PublicBattleProblem, Rating, Invite, Verdict } from "./battle-api";

export type BattleSocket = {
  connected: boolean;
  on: (event: string, listener: (...args: any[]) => void) => unknown;
  off: (event: string, listener: (...args: any[]) => void) => unknown;
  connect: () => unknown;
  disconnect: () => unknown;
  timeout: (ms: number) => { emit: (event: string, payload: unknown, ack: (error: Error | null, result: any) => void) => unknown };
};
export type BattleState = {
  connection: "connecting" | "online" | "reconnecting" | "offline";
  queue: "idle" | "queued" | "uncertain";
  matchId: string | null;
  match: BattleMatch | null;
  problem: PublicBattleProblem | null;
  rating: Rating | null;
  invite: Invite | null;
  code: string;
  verdict: Verdict | null;
  busy: string | null;
  error: string | null;
  notice: string | null;
  syncedAt: number | null;
};
type BattleApi = typeof api;
type Options = {
  userId: string;
  socket: BattleSocket;
  onExpired: () => void;
  api?: BattleApi;
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
  pollMs?: number;
};
const terminal = (match: BattleMatch | null) => Boolean(match && !["PENDING", "ACTIVE"].includes(match.status));
const messages: Record<string, string> = {
  JUDGE_UNAVAILABLE: "The judge is unavailable. No win or rating change was awarded. Try again later.",
  RATE_LIMITED: "Too many requests. Wait a moment before trying again.",
  CANNOT_JOIN_OWN_INVITE: "You cannot join your own invitation. Share the code with a friend.",
  INVITE_NOT_FOUND: "This invitation is invalid, expired, or has already been used.",
  INVITE_ALREADY_USED: "This invitation has already been used.",
  MATCH_FULL: "This match already has two players.",
  ACTIVE_MATCH_NOT_FOUND: "This match is no longer active. Refreshing the server result.",
  ALREADY_SOLVED: "Your accepted solution has already been recorded. Refreshing the result.",
  SUBMISSION_ALREADY_PROCESSED: "Another solution was processed first. Refreshing the result.",
  MATCHMAKING_IN_PROGRESS: "A match is being created. Please wait and refresh.",
  ALREADY_QUEUED: "You are already waiting. Cancel the queue before joining again.",
};
export function battleErrorMessage(error: unknown) {
  if (error instanceof ApiError) return messages[error.code] ?? (error.status === 429 ? messages.RATE_LIMITED : error.message);
  return error instanceof Error ? error.message : "The request failed. Please try again.";
}

/** One session per mounted authenticated Arena. Events only invalidate REST state. */
export class BattleSession {
  private state: BattleState = {
    connection: "connecting", queue: "idle", matchId: null, match: null, problem: null, rating: null,
    invite: null, code: "", verdict: null, busy: null, error: null, notice: null, syncedAt: null,
  };
  private listeners = new Set<() => void>();
  private api: BattleApi;
  private active = false;
  private abort = new AbortController();
  private timer?: ReturnType<typeof setInterval>;
  private refreshing = false;
  private problemId: string | null = null;
  private matchId: string | null = null;
  private key: string;
  private handlers: Record<string, (...args: any[]) => void>;
  constructor(private options: Options) {
    this.api = options.api ?? api;
    this.key = `worldofcodes-battle-v1:${options.userId}`;
    this.handlers = {
      connect: () => {
        this.update({ connection: "online" });
        if (this.matchId) this.watch(this.matchId);
        void this.refresh();
      },
      disconnect: () => {
        if (this.abort.signal.aborted) return;
        this.update({ connection: "reconnecting", ...(this.state.queue === "queued" ? {
          queue: "uncertain", notice: "Connection lost while waiting. Your queue position is not confirmed. Cancel before rejoining.",
        } : {}) });
      },
      connect_error: (error: Error) => {
        if (/UNAUTHORIZED|SESSION_EXPIRED|SESSION_INVALID/i.test(error.message)) this.expired();
        else this.update({ connection: "offline", error: "Live connection unavailable. Known matches still refresh over HTTP. Retry the connection to find an opponent." });
      },
      "battle:matched": (match: BattleMatch) => {
        if (match?.players?.some(player => player.userId === options.userId)) {
          this.update({ queue: "idle", invite: null, notice: null });
          if (this.matchId !== match.id) void this.loadMatch(match.id);
          else void this.refresh();
        }
      },
      "match:updated": () => { void this.refresh(); },
      "battle:completed": () => { void this.refresh(); },
    };
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private update(patch: Partial<BattleState>) {
    if (!this.active) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(listener => listener());
  }
  start() {
    if (this.active) return;
    this.active = true;
    this.abort = new AbortController();
    try {
      const saved = JSON.parse(this.options.storage?.getItem(this.key) ?? "null");
      if (saved && typeof saved.matchId === "string") {
        this.matchId = saved.matchId;
        this.update({ matchId: saved.matchId });
        if (saved.invite?.matchId === saved.matchId && typeof saved.invite.inviteCode === "string") {
          this.update({ invite: saved.invite });
        }
      }
    } catch { /* Storage is an optional recovery hint, never authority. */ }
    for (const [event, handler] of Object.entries(this.handlers)) this.options.socket.on(event, handler);
    this.options.socket.connect();
    void this.refresh();
    this.timer = setInterval(() => { void this.refresh(); }, this.options.pollMs ?? 2500);
  }
  stop() {
    this.active = false;
    this.abort.abort();
    clearInterval(this.timer);
    for (const [event, handler] of Object.entries(this.handlers)) this.options.socket.off(event, handler);
    this.options.socket.disconnect();
  }
  private expired() {
    if (!this.active || this.abort.signal.aborted) return;
    this.abort.abort();
    this.update({ error: "Your session has expired. Sign in again to restore your match.", connection: "offline", queue: "idle" });
    this.options.socket.disconnect();
    clearInterval(this.timer);
    this.options.onExpired();
  }
  private fail(error: unknown) {
    if (!this.active || this.abort.signal.aborted) return;
    if (error instanceof ApiError && error.status === 401) { this.expired(); return; }
    this.update({ error: battleErrorMessage(error) });
  }
  private persist() {
    try {
      if (this.matchId) this.options.storage?.setItem(this.key, JSON.stringify({ matchId: this.matchId, invite: this.state.invite }));
      else this.options.storage?.removeItem(this.key);
    } catch { /* Denied storage must not break gameplay. */ }
  }
  private watch(matchId: string) {
    if (!this.options.socket.connected) return;
    this.options.socket.timeout(8000).emit("match:watch", { matchId }, (error, response) => {
      if (!error && response?.ok === false && ["UNAUTHORIZED", "SESSION_INVALID"].includes(response.code)) this.expired();
      // No reliance on the acknowledgement: polling is authoritative and survives REST updates.
    });
  }
  refresh = async () => {
    if (!this.active || this.refreshing || this.abort.signal.aborted) return;
    this.refreshing = true;
    const id = this.matchId;
    try {
      if (id) {
        const match = await this.api.getBattleMatch(id, this.abort.signal);
        if (!this.active || id !== this.matchId) return;
        this.update({ match, queue: "idle", syncedAt: Date.now() });
        if (match.status !== "PENDING" && this.state.invite) { this.update({ invite: null }); this.persist(); }
        if (match.problemId !== this.problemId) {
          const problem = await this.api.getBattleProblem(match.problemId, this.abort.signal);
          if (!this.active || id !== this.matchId) return;
          this.problemId = match.problemId;
          this.update({ problem, code: this.state.code || problem.starterCode });
        }
      }
      const rating = await this.api.getBattleRating(this.abort.signal);
      this.update({ rating });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404 && id) {
        this.update({ notice: "The saved match is not available to this account. You can clear it or retry." });
      }
      this.fail(error);
    } finally { this.refreshing = false; }
  };
  private async action(name: string, run: () => Promise<void>) {
    if (!this.active || this.state.busy || this.abort.signal.aborted) return;
    this.update({ busy: name, error: null, notice: null });
    try { await run(); } catch (error) { this.fail(error); }
    finally { this.update({ busy: null }); }
  }
  private async loadMatch(id: string) {
    this.matchId = id;
    this.problemId = null;
    this.update({ matchId: id, match: null, problem: null, code: "", verdict: null, queue: "idle" });
    this.persist();
    this.watch(id);
    // A prior refresh may still be in flight. It will discard the old ID, then the next poll reloads.
    await this.refresh();
  }
  joinRanked = () => this.action("queue", async () => {
    if (this.matchId || this.state.queue !== "idle") throw new Error("Finish or clear your current match, or cancel your existing queue first.");
    if (!this.options.socket.connected) throw new Error("Connect to the live server before joining ranked matchmaking.");
    const result = await new Promise<any>((resolve, reject) => {
      this.options.socket.timeout(8000).emit("ranked:join", {}, (error, response) => {
        if (error) reject(new Error("Queue acknowledgement was lost. Cancel the queue before retrying."));
        else if (!response?.ok) reject(new ApiError(["UNAUTHORIZED", "SESSION_INVALID"].includes(response?.code) ? 401 : 409, response?.code ?? "QUEUE_FAILED", response?.message ?? "Unable to join the queue."));
        else resolve(response);
      });
    }).catch(error => { this.update({ queue: "uncertain" }); throw error; });
    if (!this.active) return;
    if (result.status === "MATCHED") await this.loadMatch(result.match.id);
    else if (!this.matchId) this.update({ queue: "queued", notice: "Waiting for an opponent. The server queue expires after about a minute. Cancel and rejoin if needed." });
  });
  leaveRanked = () => this.action("leave", async () => {
    await this.api.leaveRankedQueue(this.abort.signal);
    if (!this.matchId) this.update({ queue: "idle", notice: "You have left the ranked queue." });
  });
  createInvite = () => this.action("invite", async () => {
    if (this.matchId || this.state.queue !== "idle") throw new Error("Clear your current match or cancel the queue before creating an invitation.");
    const invite = await this.api.createBattleInvite(this.abort.signal);
    if (!this.active) return;
    this.update({ invite });
    await this.loadMatch(invite.matchId);
  });
  joinInvite = (code: string) => this.action("join", async () => {
    if (!code.trim()) throw new Error("Enter an invitation code.");
    if (this.matchId || this.state.queue !== "idle") throw new Error("Clear your current match or cancel the queue before joining an invitation.");
    const match = await this.api.joinBattleInvite(code.trim(), this.abort.signal);
    if (!this.active) return;
    this.update({ invite: null });
    await this.loadMatch(match.id);
  });
  recoverMatch = (id: string) => this.action("restore", async () => {
    if (!id.trim()) throw new Error("Enter a match ID.");
    if (this.state.queue !== "idle") throw new Error("Cancel the queue before restoring a match.");
    const match = await this.api.getBattleMatch(id.trim(), this.abort.signal);
    if (this.active) await this.loadMatch(match.id);
  });
  submit = () => this.action("submit", async () => {
    const match = this.state.match;
    if (!match || match.status !== "ACTIVE") throw new Error("This match is not active. Refresh the server state.");
    if (!this.state.code.trim() || this.state.code.length > 20000) throw new Error("Submit the complete Python function, between 1 and 20,000 characters.");
    try {
      const verdict = await this.api.submitBattleCode(match.id, this.state.code, this.abort.signal);
      if (this.matchId === match.id) this.update({ verdict });
    } finally { await this.refresh(); }
  });
  setCode = (code: string) => this.update({ code });
  dismissError = () => this.update({ error: null });
  reconnect = () => { this.update({ error: null, connection: "connecting" }); this.options.socket.connect(); void this.refresh(); };
  clearMatch = () => {
    if (this.state.busy) return;
    if (this.state.match && !terminal(this.state.match)) {
      this.update({ error: "An unfinished match cannot be abandoned here. Keep its ID to restore it later." });
      return;
    }
    this.matchId = null;
    this.problemId = null;
    this.update({ matchId: null, match: null, problem: null, invite: null, code: "", verdict: null, error: null, notice: null });
    this.persist();
  };
}
