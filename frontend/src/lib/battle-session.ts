import { ApiError } from "./api";
import * as api from "./battle-api";
import type {
  BattleMatch,
  BattleStateSnapshot,
  Invite,
  PublicBattleProblem,
  Rating,
  Verdict,
} from "./battle-api";

export type BattleConnection = "connecting" | "synced" | "offline";
export type BattleQueue = "idle" | "queued" | "uncertain";
export type BattleState = {
  connection: BattleConnection;
  queue: BattleQueue;
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
  onExpired: () => void;
  api?: BattleApi;
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
  pollMs?: number;
};

const terminal = (match: BattleMatch | null) =>
  Boolean(match && !["PENDING", "ACTIVE"].includes(match.status));

const messages: Record<string, string> = {
  JUDGE_UNAVAILABLE:
    "The judge is unavailable. No win or rating change was awarded. Try again later.",
  RATE_LIMITED: "Too many requests. Wait a moment before trying again.",
  CANNOT_JOIN_OWN_INVITE:
    "You cannot join your own invitation. Share the code with a friend.",
  INVITE_NOT_FOUND:
    "This invitation code is invalid, expired, or has already been used.",
  INVITE_ALREADY_USED:
    "This invitation has already been used. Ask your friend for a new code.",
  INVALID_INVITE: "Enter the invitation code your friend shared with you.",
  MATCH_FULL: "This match already has two players.",
  BATTLE_NOT_FOUND: "This match is not available to this account.",
  ALREADY_QUEUED:
    "You are already waiting. Cancel the queue before joining again.",
  MATCHMAKING_IN_PROGRESS:
    "A match is being created. Wait a moment and refresh.",
  SESSION_INVALID: "Your session has expired. Sign in again to restore your match.",
};

export function battleErrorMessage(error: unknown) {
  if (error instanceof ApiError)
    return messages[error.code] ?? (error.status === 429 ? messages.RATE_LIMITED : error.message);
  return error instanceof Error ? error.message : "The request failed. Please try again.";
}

/**
 * REST-first Arena session. `GET /battle/state` is the authority used on mount
 * and on every poll; the browser only stores a hint for a pending invitation,
 * because that endpoint returns active matches only.
 */
export class BattleSession {
  private state: BattleState = {
    connection: "connecting",
    queue: "idle",
    matchId: null,
    match: null,
    problem: null,
    rating: null,
    invite: null,
    code: "",
    verdict: null,
    busy: null,
    error: null,
    notice: null,
    syncedAt: null,
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

  constructor(private options: Options) {
    this.api = options.api ?? api;
    this.key = `worldofcodes-battle-v1:${options.userId}`;
  }

  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private update(patch: Partial<BattleState>) {
    if (!this.active) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.abort = new AbortController();
    void this.restore();
    this.timer = setInterval(() => void this.refresh(), this.options.pollMs ?? 2500);
  }

  stop() {
    this.active = false;
    this.abort.abort();
    clearInterval(this.timer);
  }

  private readHint(): { matchId: string; invite?: Invite } | null {
    try {
      const saved = JSON.parse(this.options.storage?.getItem(this.key) ?? "null");
      return saved && typeof saved.matchId === "string" ? saved : null;
    } catch {
      return null;
    }
  }

  private persist() {
    try {
      if (this.matchId && this.state.match?.status === "PENDING") {
        this.options.storage?.setItem(
          this.key,
          JSON.stringify({ matchId: this.matchId, invite: this.state.invite }),
        );
      } else {
        this.options.storage?.removeItem(this.key);
      }
    } catch {
      /* Denied storage must not break gameplay. */
    }
  }

  private clearHint() {
    try {
      this.options.storage?.removeItem(this.key);
    } catch {
      /* ignore */
    }
  }

  private fail(error: unknown) {
    if (!this.active || this.abort.signal.aborted) return;
    if (error instanceof ApiError && error.status === 401) {
      this.abort.abort();
      clearInterval(this.timer);
      this.update({
        error: "Your session has expired. Sign in again to restore your match.",
        connection: "offline",
        queue: "idle",
      });
      this.options.onExpired();
      return;
    }
    this.update({ connection: "offline", error: battleErrorMessage(error) });
  }

  private applyQueue(snapshot: BattleStateSnapshot) {
    if (this.state.queue === "uncertain" || this.matchId) return;
    if (snapshot.queue?.status === "QUEUED") this.update({ queue: "queued" });
    else if (snapshot.queue?.status === "NOT_QUEUED") this.update({ queue: "idle" });
  }

  private async applyMatch(match: BattleMatch) {
    const patch: Partial<BattleState> = { match };
    if (match.status === "ACTIVE") {
      patch.queue = "idle";
      patch.invite = null;
    } else if (terminal(match)) {
      patch.invite = null;
    }
    this.update(patch);
    if (match.problemId !== this.problemId) {
      this.problemId = match.problemId;
      const problem = await this.api.getBattleProblem(match.problemId, this.abort.signal);
      if (!this.active || this.matchId !== match.id) return;
      this.update({ problem, code: this.state.code || problem.starterCode });
    }
    this.persist();
  }

  private dropMatch() {
    this.matchId = null;
    this.problemId = null;
    this.clearHint();
    this.update({
      matchId: null,
      match: null,
      problem: null,
      invite: null,
      code: "",
      verdict: null,
    });
  }

  private async loadMatch(id: string, known?: BattleMatch) {
    this.matchId = id;
    this.problemId = null;
    this.update({ matchId: id, match: known ?? null, problem: null, code: "", verdict: null, queue: "idle" });
    const match = known ?? (await this.api.getBattleMatch(id, this.abort.signal));
    if (!this.active || this.matchId !== id) return;
    await this.applyMatch(match);
  }

  private async restore() {
    try {
      const snapshot = await this.api.getBattleState(this.abort.signal);
      if (!this.active) return;
      this.applyQueue(snapshot);
      if (snapshot.match) await this.loadMatch(snapshot.match.id, snapshot.match);
      else await this.restoreInviteHint();
      const rating = await this.api.getBattleRating(this.abort.signal);
      if (!this.active) return;
      this.update({ rating, connection: "synced", syncedAt: Date.now() });
    } catch (error) {
      this.fail(error);
    }
  }

  private async restoreInviteHint() {
    const hint = this.readHint();
    if (!hint?.matchId) return;
    try {
      const match = await this.api.getBattleMatch(hint.matchId, this.abort.signal);
      if (!this.active || this.matchId) return;
      if (match.type === "FRIENDLY" && match.status === "PENDING") {
        this.matchId = match.id;
        this.update({ matchId: match.id, match, invite: hint.invite ?? null });
      } else if (match.status === "ACTIVE") {
        await this.loadMatch(match.id, match);
      } else {
        this.clearHint();
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        this.clearHint();
        this.update({ notice: "Your saved invitation is no longer available." });
        return;
      }
      throw error;
    }
  }

  refresh = async () => {
    if (!this.active || this.refreshing || this.abort.signal.aborted) return;
    this.refreshing = true;
    const signal = this.abort.signal;
    try {
      const snapshot = await this.api.getBattleState(signal);
      if (!this.active) return;
      this.applyQueue(snapshot);
      const activeId = snapshot.match?.id ?? null;
      if (activeId && activeId !== this.matchId) {
        await this.loadMatch(activeId, snapshot.match ?? undefined);
      } else if (this.matchId) {
        const match = await this.api.getBattleMatch(this.matchId, signal).catch((error: unknown) => {
          if (error instanceof ApiError && error.status === 404) return null;
          throw error;
        });
        if (!this.active) return;
        if (!match) {
          if (!activeId) {
            this.update({ notice: "This match is no longer available on the server." });
            this.dropMatch();
          }
        } else {
          await this.applyMatch(match);
        }
      }
      if (!this.matchId || terminal(this.state.match)) {
        const rating = await this.api.getBattleRating(signal);
        if (this.active) this.update({ rating });
      }
      this.update({ connection: "synced", syncedAt: Date.now() });
    } catch (error) {
      this.fail(error);
    } finally {
      this.refreshing = false;
    }
  };

  private async action(name: string, run: () => Promise<void>) {
    if (!this.active || this.state.busy || this.abort.signal.aborted) return;
    this.update({ busy: name, error: null, notice: null });
    try {
      await run();
    } catch (error) {
      this.fail(error);
    } finally {
      this.update({ busy: null });
    }
  }

  joinRanked = () =>
    this.action("queue", async () => {
      if (this.matchId || this.state.queue !== "idle")
        throw new Error("Finish your current match or cancel the queue first.");
      let result;
      try {
        result = await this.api.joinRankedQueue(this.abort.signal);
      } catch (error) {
        if (error instanceof ApiError && error.status === 0) {
          this.update({
            queue: "uncertain",
            notice:
              "The queue answer was lost. Check your state or cancel before joining again.",
          });
        }
        throw error;
      }
      if (!this.active) return;
      if (result.status === "MATCHED") {
        await this.loadMatch(result.match.id, result.match);
      } else {
        this.update({
          queue: "queued",
          notice: "Waiting for an opponent. Queue tickets expire after about a minute.",
        });
      }
    });

  leaveRanked = () =>
    this.action("leave", async () => {
      await this.api.leaveRankedQueue(this.abort.signal);
      if (!this.active) return;
      this.update({ queue: "idle", notice: "You have left the ranked queue." });
    });

  createInvite = () =>
    this.action("invite", async () => {
      if (this.matchId || this.state.queue !== "idle")
        throw new Error("Clear your current match or cancel the queue before creating an invitation.");
      const invite = await this.api.createBattleInvite(this.abort.signal);
      if (!this.active) return;
      this.update({ invite });
      await this.loadMatch(invite.matchId);
    });

  joinInvite = (code: string) =>
    this.action("join", async () => {
      const trimmed = code.trim();
      if (!trimmed) throw new Error("Enter the invitation code your friend shared with you.");
      if (this.matchId || this.state.queue !== "idle")
        throw new Error("Clear your current match or cancel the queue before joining an invitation.");
      const match = await this.api.joinBattleInvite(trimmed, this.abort.signal);
      if (!this.active) return;
      this.update({ invite: null });
      await this.loadMatch(match.id, match);
    });

  recoverMatch = (id: string) =>
    this.action("restore", async () => {
      if (!id.trim()) throw new Error("Enter a match ID.");
      if (this.state.queue !== "idle") throw new Error("Cancel the queue before restoring a match.");
      const match = await this.api.getBattleMatch(id.trim(), this.abort.signal);
      if (this.active) await this.loadMatch(match.id, match);
    });

  submit = () =>
    this.action("submit", async () => {
      const match = this.state.match;
      if (!match || match.status !== "ACTIVE")
        throw new Error("This match is not active. Refresh the server state.");
      if (!this.state.code.trim() || this.state.code.length > 20000)
        throw new Error(
          "Submit the complete Python function, between 1 and 20,000 characters.",
        );
      try {
        const verdict = await this.api.submitBattleCode(match.id, this.state.code, this.abort.signal);
        if (this.matchId === match.id) this.update({ verdict });
      } finally {
        await this.refresh();
      }
    });

  setCode = (code: string) => this.update({ code });
  dismissError = () => this.update({ error: null });
  dismissNotice = () => this.update({ notice: null });
  reload = () => {
    if (!this.active) return;
    this.update({ connection: "connecting", error: null });
    void this.refresh();
  };
  clearMatch = () => {
    if (this.state.busy) return;
    if (this.state.match && !terminal(this.state.match)) {
      this.update({
        error: "An unfinished match cannot be abandoned here. Keep its ID to restore it later.",
      });
      return;
    }
    this.dropMatch();
    this.update({ error: null, notice: null });
  };
}
