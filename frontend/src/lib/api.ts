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
  nickname: string;
  avatarUrl: string | null;
  xp: number;
  level: number;
  completedLessons: number;
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
  avatarUrl?: string | null;
}) {
  return request<ServerUser>("/users/me", {
    method: "PATCH",
    body: input,
  });
}

export function getPublicProfile(nickname: string) {
  return request<PublicProfile>(`/users/${encodeURIComponent(nickname)}`);
}
