const TOKEN_KEY = "worldofcodes-session-v1";
let baseUrl = "/api";
let memoryToken: string | null | undefined;

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export type ServerUser = {
  id: string;
  email: string;
  username: string;
  nickname: string;
  avatarUrl: string | null;
  xp: number;
  coins: number;
  level: number;
  nicknameChanges: number;
  nextNicknameChange: "FREE" | "PAYMENT_REQUIRED";
  completedLessons?: number;
};

export type AuthResponse = {
  token: string;
  user: ServerUser;
};

export type PublicProfile = {
  id: string;
  username: string;
  nickname: string;
  avatarUrl: string | null;
  xp: number;
  level: number;
  joinedAt: string;
  completedLessons: number;
  solvedProblems: number;
  submissions: number;
  followers: number;
  following: number;
  isFollowing: boolean;
  isMe: boolean;
  rating: {
    points: number;
    wins: number;
    losses: number;
    draws: number;
  } | null;
};

export type ActivityDay = {
  date: string;
  weekday: number;
  submissions: number;
  accepted: number;
  solved: number;
};

export type ActivityBreakdown = {
  submissions: number;
  solved: number;
  accepted: number;
};

export type ActivityResponse = {
  from: string;
  to: string;
  days: ActivityDay[];
  months: { month: string; submissions: number; solved: number }[];
  totals: {
    submissions: number;
    solved: number;
    accepted: number;
    activeDays: number;
    maxStreak: number;
    currentStreak: number;
  };
  windows: {
    last30: { submissions: number; solved: number };
    previous30: { submissions: number; solved: number };
  };
  topics: ({ topic: string } & ActivityBreakdown)[];
  difficulties: ({ difficulty: "EASY" | "MEDIUM" | "HARD" } & ActivityBreakdown)[];
  allTime: { submissions: number; solved: number };
};

export type FollowResult = {
  following: boolean;
  followersCount: number;
};

export type CommunityEntry = {
  id: string;
  username: string;
  nickname: string;
  avatarUrl: string | null;
  xp: number;
  level: number;
  followedAt: string;
};

export type CommunityList = {
  total: number;
  items: CommunityEntry[];
  hasMore: boolean;
};

function storage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function getToken() {
  if (memoryToken !== undefined) return memoryToken;
  try {
    memoryToken = storage()?.getItem(TOKEN_KEY) ?? null;
  } catch {
    memoryToken = null;
  }
  return memoryToken;
}

export function setToken(token: string | null) {
  memoryToken = token;
  try {
    if (token) storage()?.setItem(TOKEN_KEY, token);
    else storage()?.removeItem(TOKEN_KEY);
  } catch {
    // The in-memory session still works for this page.
  }
}

export function configureApi(options: { baseUrl?: string }) {
  if (options.baseUrl) baseUrl = options.baseUrl.replace(/\/$/, "");
}

export async function request<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    signal?: AbortSignal;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  const headers = new Headers({ Accept: "application/json" });
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body !== undefined)
    headers.set("Content-Type", "application/json");

  const timeout = AbortSignal.timeout(options.timeoutMs ?? 20000);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal
        ? AbortSignal.any([options.signal, timeout])
        : timeout,
    });
  } catch (error) {
    const name = (error as { name?: string })?.name;
    if (name === "AbortError" || name === "TimeoutError") {
      throw new ApiError(
        0,
        "NETWORK_TIMEOUT",
        "The server did not respond. Try again.",
      );
    }
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Cannot reach the WorldOfCodes server. Check that it is running and try again.",
    );
  }

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const code =
      (payload as { error?: { code?: string } })?.error?.code ??
      `HTTP_${response.status}`;
    const message =
      (payload as { error?: { message?: string } })?.error?.message ??
      "The server could not complete the request.";
    if (response.status === 401 && token && !path.startsWith("/auth/")) {
      setToken(null);
    }
    throw new ApiError(response.status, code, message);
  }

  return payload as T;
}

export function register(input: {
  email: string;
  password: string;
  nickname: string;
  username: string;
}) {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: input,
  });
}

export function login(input: { email: string; password: string }) {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: input,
  });
}

export function logout() {
  return request<void>("/auth/logout", { method: "POST" });
}

export function me() {
  return request<ServerUser>("/users/me");
}

export function updateProfile(input: {
  nickname?: string;
  username?: string;
  avatarUrl?: string | null;
}) {
  return request<ServerUser>("/users/me", {
    method: "PATCH",
    body: input,
  });
}

export function getPublicProfile(handle: string) {
  return request<PublicProfile>(`/users/${encodeURIComponent(handle)}`);
}

export function getProfileActivity(handle: string, days = 365) {
  return request<ActivityResponse>(
    `/users/${encodeURIComponent(handle)}/activity?days=${days}`,
  );
}

export function followUser(handle: string) {
  return request<FollowResult>(`/users/${encodeURIComponent(handle)}/follow`, {
    method: "POST",
  });
}

export function unfollowUser(handle: string) {
  return request<FollowResult>(`/users/${encodeURIComponent(handle)}/follow`, {
    method: "DELETE",
  });
}

export function getFollowers(handle: string, offset = 0, limit = 20) {
  return request<CommunityList>(
    `/users/${encodeURIComponent(handle)}/followers?limit=${limit}&offset=${offset}`,
  );
}

export function getFollowing(handle: string, offset = 0, limit = 20) {
  return request<CommunityList>(
    `/users/${encodeURIComponent(handle)}/following?limit=${limit}&offset=${offset}`,
  );
}

export type ChatPeer = {
  id: string;
  username: string;
  nickname: string;
  avatarUrl: string | null;
};

export type DirectMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

export type Conversation = {
  peer: ChatPeer;
  lastMessage: DirectMessage;
  unread: number;
};

export type ConversationList = {
  items: Conversation[];
};

export type ChatThread = {
  peer: ChatPeer;
  messages: DirectMessage[];
};

export function getConversations() {
  return request<ConversationList>("/chat/conversations");
}

export function getChatThread(peerId: string) {
  return request<ChatThread>(
    `/chat/${encodeURIComponent(peerId)}/messages`,
  );
}

export function sendChatMessage(peerId: string, body: string) {
  return request<{ peer: ChatPeer; message: DirectMessage }>(
    `/chat/${encodeURIComponent(peerId)}/messages`,
    { method: "POST", body: { body } },
  );
}

export function markChatRead(peerId: string) {
  return request<{ peer: ChatPeer; read: number }>(
    `/chat/${encodeURIComponent(peerId)}/read`,
    { method: "POST" },
  );
}
