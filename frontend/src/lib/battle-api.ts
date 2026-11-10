import { ApiError, getToken, setToken } from "./api";

export type VerdictStatus = "ACCEPTED" | "WRONG_ANSWER" | "RUNTIME_ERROR" | "TIME_LIMIT";
export type BattlePlayer = {
  userId: string;
  seat: number;
  submittedAt: string | null;
  verdict: VerdictStatus | null;
  ratingDelta: number | null;
  user: { nickname: string; avatarUrl: string | null };
};
export type BattleMatch = {
  id: string;
  type: "RANKED" | "FRIENDLY";
  status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "EXPIRED";
  problemId: string;
  winnerId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  players: BattlePlayer[];
};
/** Only public sample cases from GET /problems/:id, never the judge's test bank. */
export type PublicBattleProblem = {
  id: string;
  lessonId: string | null;
  title: string;
  statement: string;
  language: string;
  topicSlug: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  functionName: string;
  starterCode: string;
  rewardXp: number;
  rewardCoins: number;
  examples: { args: unknown[]; expected: unknown }[];
};
export type Rating = { points: number; wins: number; losses: number; draws: number };
export type Invite = { matchId: string; inviteCode: string; expiresInSeconds: number };
export type Verdict = {
  status: VerdictStatus;
  passedCases: number;
  totalCases: number;
  matchCompleted: boolean;
  winnerId: string | null;
  settled?: boolean;
};
export type RankedQueueResult =
  | { status: "QUEUED"; ticketId: string }
  | { status: "MATCHED"; match: BattleMatch };
export type QueueState =
  | { status: "NOT_QUEUED" }
  | { status: "QUEUED"; ticketId: string; position: number; joinedAt: string }
  | { status: "MATCHMAKING" };
export type BattleStateSnapshot = { match: BattleMatch | null; queue: QueueState };

let baseUrl = "/api";
export function configureBattleApi(options: { baseUrl?: string }) {
  if (options.baseUrl !== undefined) baseUrl = options.baseUrl.replace(/\/$/, "");
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  const token = getToken();
  const headers = new Headers({ Accept: "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  const timeout = AbortSignal.timeout(options.timeoutMs ?? 20000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal,
    });
    if (response.status === 401) setToken(null);
    if (response.status === 204) return undefined as T;
    const payload = await response.json().catch((error: unknown) => {
      if (signal.aborted) throw error;
      return null;
    });
    if (!response.ok) {
      throw new ApiError(response.status, payload?.error?.code ?? `HTTP_${response.status}`,
        payload?.error?.message ?? "The server could not complete the request.");
    }
    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (options.signal?.aborted) throw new ApiError(0, "REQUEST_CANCELLED", "The request was cancelled.");
    const name = (error as { name?: string })?.name;
    if (timeout.aborted || name === "TimeoutError" || name === "AbortError") {
      throw new ApiError(0, "NETWORK_TIMEOUT", "The server did not respond. Try again.");
    }
    throw new ApiError(0, "NETWORK_ERROR", "Cannot reach the WorldOfCodes server. Check that it is running and try again.");
  }
}

export function getBattleMatch(id: string, signal?: AbortSignal) {
  return request<BattleMatch>(`/battle/matches/${encodeURIComponent(id)}`, { signal });
}
/** Authoritative recovery snapshot: the active match and queue ticket for this account. */
export function getBattleState(signal?: AbortSignal) {
  return request<BattleStateSnapshot>("/battle/state", { signal });
}
export async function getBattleProblem(id: string, signal?: AbortSignal) {
  const result = await request<{ problem: PublicBattleProblem }>(`/problems/${encodeURIComponent(id)}`, { signal });
  return result.problem;
}
export function getBattleRating(signal?: AbortSignal) {
  return request<Rating>("/battle/rating/me", { signal });
}
export function createBattleInvite(signal?: AbortSignal) {
  return request<Invite>("/battle/friendly", { method: "POST", signal });
}
export function joinBattleInvite(code: string, signal?: AbortSignal) {
  return request<BattleMatch>(`/battle/friendly/${encodeURIComponent(code)}/join`, { method: "POST", signal });
}
export function joinRankedQueue(signal?: AbortSignal) {
  return request<RankedQueueResult>("/battle/ranked/queue", { method: "POST", signal });
}
export function leaveRankedQueue(signal?: AbortSignal) {
  return request<{ status: "LEFT_QUEUE" }>("/battle/ranked/queue", { method: "DELETE", signal });
}
export function submitBattleCode(id: string, code: string, signal?: AbortSignal) {
  return request<Verdict>(`/battle/matches/${encodeURIComponent(id)}/submit`, {
    method: "POST", body: { code }, signal, timeoutMs: 60000,
  });
}
