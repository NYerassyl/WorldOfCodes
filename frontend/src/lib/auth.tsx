import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import * as api from "./api";
import { ApiError, getToken, setToken, type ServerUser } from "./api";

export type AuthStatus =
  "loading" | "anonymous" | "authenticated" | "unavailable";

type AuthValue = {
  status: AuthStatus;
  user: ServerUser | null;
  error: string | null;
  login: (input: { email: string; password: string }) => Promise<ServerUser>;
  register: (input: {
    email: string;
    password: string;
    nickname: string;
  }) => Promise<ServerUser>;
  logout: () => Promise<void>;
  retry: () => Promise<void>;
  updateProfile: (input: {
    nickname?: string;
    avatarUrl?: string | null;
  }) => Promise<ServerUser>;
};

const Context = createContext<AuthValue | null>(null);

export function authErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Try again.";
}

export function Provider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() =>
    getToken() ? "loading" : "anonymous",
  );
  const [user, setUser] = useState<ServerUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const restore = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setError(null);
      setStatus("anonymous");
      return;
    }
    try {
      const next = await api.me();
      setUser(next);
      setError(null);
      setStatus("authenticated");
    } catch (caught) {
      if (
        caught instanceof ApiError &&
        (caught.status === 401 || caught.status === 403)
      ) {
        setToken(null);
        setUser(null);
        setError(null);
        setStatus("anonymous");
        return;
      }
      setUser(null);
      setError(authErrorMessage(caught));
      setStatus("unavailable");
    }
  }, []);

  useEffect(() => {
    void restore();
  }, [restore]);

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      const result = await api.login(input);
      setToken(result.token);
      setUser(result.user);
      setError(null);
      setStatus("authenticated");
      void restore();
      return result.user;
    },
    [restore],
  );

  const register = useCallback(
    async (input: { email: string; password: string; nickname: string }) => {
      const result = await api.register(input);
      setToken(result.token);
      setUser(result.user);
      setError(null);
      setStatus("authenticated");
      void restore();
      return result.user;
    },
    [restore],
  );

  const logout = useCallback(async () => {
    try {
      if (getToken()) await api.logout();
    } catch {
      // Signing out locally must succeed even when the server is unreachable.
    }
    setToken(null);
    setUser(null);
    setError(null);
    setStatus("anonymous");
  }, []);

  const updateProfile = useCallback(
    async (input: { nickname?: string; avatarUrl?: string | null }) => {
      try {
        const next = await api.updateProfile(input);
        const merged: ServerUser = {
          ...(user ?? next),
          ...next,
          completedLessons: next.completedLessons ?? user?.completedLessons,
        };
        setUser(merged);
        setError(null);
        setStatus("authenticated");
        return merged;
      } catch (caught) {
        if (
          caught instanceof ApiError &&
          (caught.status === 401 || caught.status === 403)
        ) {
          setToken(null);
          setUser(null);
          setError(null);
          setStatus("anonymous");
        }
        throw caught;
      }
    },
    [user],
  );

  return (
    <Context.Provider
      value={{
        status,
        user,
        error,
        login,
        register,
        logout,
        retry: restore,
        updateProfile,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing auth provider");
  return value;
}

export { getToken, setToken };
