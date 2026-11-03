import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { award } from "./progress.mjs";
export type State = {
  name: string;
  bio: string;
  avatar: string;
  frame: string;
  renamed: boolean;
  xp: number;
  coins: number;
  completed: string[];
  practice: Record<string, number[]>;
  labs: string[];
  activity: Record<string, number>;
  drafts: Record<string, string>;
};
const KEY = "worldofcodes-demo-v1";
const initial: State = {
  name: "Arlan",
  bio: "A little better than yesterday.",
  avatar: "A",
  frame: "sage",
  renamed: false,
  xp: 0,
  coins: 0,
  completed: [],
  practice: {},
  labs: [],
  activity: {},
  drafts: {},
};
let readFailed = false;
function load(): State {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!raw) return initial;
    return {
      ...initial,
      ...raw,
      name: typeof raw.name === "string" ? raw.name : initial.name,
      xp: Number.isFinite(raw.xp) && raw.xp >= 0 ? raw.xp : 0,
      coins: Number.isFinite(raw.coins) && raw.coins >= 0 ? raw.coins : 0,
      completed: Array.isArray(raw.completed)
        ? raw.completed.filter((x: unknown) => typeof x === "string")
        : [],
      practice:
        raw.practice && typeof raw.practice === "object"
          ? (Object.fromEntries(
              Object.entries(raw.practice)
                .filter(([, value]) => Array.isArray(value))
                .map(([key, value]) => [
                  key,
                  (value as unknown[]).filter((n) => Number.isInteger(n)),
                ]),
            ) as Record<string, number[]>)
          : {},
      labs: Array.isArray(raw.labs)
        ? raw.labs.filter((x: unknown) => typeof x === "string")
        : [],
      activity:
        raw.activity && typeof raw.activity === "object" ? raw.activity : {},
      drafts: raw.drafts && typeof raw.drafts === "object" ? raw.drafts : {},
    };
  } catch {
    readFailed = true;
    return initial;
  }
}
type Store = {
  state: State;
  update: (patch: Partial<State>) => void;
  reward: (id: string, xp?: number, coins?: number) => void;
  completeTask: (key: string, index: number) => void;
  completeLab: (key: string) => void;
  draft: (id: string, code: string) => void;
  storageError: boolean;
};
const Context = createContext<Store | null>(null);
export function Provider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(load);
  const [storageError, setError] = useState(readFailed);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      setError(true);
    }
  }, [state]);
  return (
    <Context.Provider
      value={{
        state,
        storageError,
        update: (patch) => setState((s) => ({ ...s, ...patch })),
        reward: (id, xp = 40, coins = 15) =>
          setState((s) => award(s, id, xp, coins)),
        completeTask: (key, index) =>
          setState((s) => {
            const current = s.practice[key] ?? [];
            if (current.includes(index)) return s;
            return {
              ...s,
              practice: { ...s.practice, [key]: [...current, index] },
            };
          }),
        completeLab: (key) =>
          setState((s) =>
            s.labs.includes(key)
              ? s
              : { ...award(s, key, 10, 5), labs: [...s.labs, key] },
          ),
        draft: (id, code) =>
          setState((s) => ({ ...s, drafts: { ...s.drafts, [id]: code } })),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing provider");
  return value;
}
