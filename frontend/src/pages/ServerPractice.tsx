import { useEffect, useState, type ReactNode } from "react";
import { Heading, Editor, Notice } from "../components/UI";
import { useAuth, authErrorMessage } from "../lib/auth";
import * as api from "../lib/learning-api";
import "./server-practice.css";
function useResource<T>(load: () => Promise<T>, key: string) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setData(undefined);
    setError("");
    load()
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(authErrorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [key, version]);
  return { data, error, reload: () => setVersion((v) => v + 1) };
}
function Load({ error, retry }: { error: string; retry: () => void }) {
  return error ? (
    <div className="result error" role="alert">
      {error}{" "}
      <button className="btn secondary" onClick={retry}>
        Retry
      </button>
    </div>
  ) : (
    <p role="status">Loading your workspace…</p>
  );
}
function Gate() {
  return (
    <Notice>
      <a href="#profile">Sign in or create an account</a> to submit work and
      save your progress.
    </Notice>
  );
}
function Theory({ text }: { text: string }) {
  return (
    <article className="server-theory">
      {text.split(/(```[\s\S]*?```)/g).map((part, i) =>
        part.startsWith("```") ? (
          <pre key={i}>
            <code>{part.replace(/^```[^\n]*\n/, "").replace(/```$/, "")}</code>
          </pre>
        ) : (
          part
            .split("\n\n")
            .map((p, j) =>
              p.startsWith("# ") ? (
                <h2 key={`${i}-${j}`}>{p.slice(2)}</h2>
              ) : (
                <p key={`${i}-${j}`}>{p}</p>
              ),
            )
        ),
      )}
    </article>
  );
}
function Card({
  href,
  title,
  detail,
  children,
}: {
  href: string;
  title: string;
  detail: string;
  children?: ReactNode;
}) {
  return (
    <a className="server-card panel" href={href}>
      <span className="tag">{detail}</span>
      <h2>{title}</h2>
      {children}
      <span className="text-link">Open workspace →</span>
    </a>
  );
}
export function ServerLearning({ lessonId }: { lessonId?: string }) {
  const { user } = useAuth();
  const resource = useResource(() => api.courses(), "courses");
  const state = useResource(
    () =>
      user
        ? api.progress()
        : Promise.resolve({ lessons: [], completedProblems: [] }),
    user?.id ?? "guest",
  );
  if (lessonId) return <LessonWorkspace id={lessonId} />;
  return (
    <>
      <Heading
        title="Build your Python foundations."
        description="Six topics. Read the theory, then solve every practice problem to complete each lesson."
      />
      {!user && <Gate />}
      {!resource.data ? (
        <Load error={resource.error} retry={resource.reload} />
      ) : (
        <div className="server-card-grid">
          {resource.data.courses
            .filter((c) => c.language === "python")
            .flatMap((c) => c.topics)
            .flatMap((t) =>
              t.lessons.map((l) => (
                <Card
                  key={l.id}
                  href={`#learn/python/${l.id}`}
                  title={t.title}
                  detail={
                    state.data?.lessons.find((p) => p.lessonId === l.id)
                      ?.state === "COMPLETED"
                      ? "Completed"
                      : "Python · Theory + practice"
                  }
                />
              )),
            )}
        </div>
      )}
      {state.error && <Load error={state.error} retry={state.reload} />}
    </>
  );
}
function LessonWorkspace({ id }: { id: string }) {
  const { user } = useAuth();
  const resource = useResource(() => api.lesson(id), id);
  const [selected, setSelected] = useState("");
  const [version, setVersion] = useState(0);
  const state = useResource(async () => {
    if (!user) return { lessons: [], completedProblems: [] };
    await api.startLesson(id);
    return api.progress();
  }, `${id}-${user?.id}-${version}`);
  const lesson = resource.data?.lesson;
  if (!lesson) return <Load error={resource.error} retry={resource.reload} />;
  const complete = state.data?.lessons.some(
    (l) => l.lessonId === id && l.state === "COMPLETED",
  );
  const chosen = selected || lesson.problems[0]?.id;
  return (
    <>
      <a className="text-link" href="#learn/python">
        ← Python foundations
      </a>
      <Heading
        title={lesson.title}
        description={
          complete
            ? "Lesson completed. Keep practicing whenever you like."
            : "Read the theory, then pass every problem. Rewards are verified by the server."
        }
      />
      <section className="panel">
        <Theory text={lesson.theoryMd} />
      </section>
      <div
        className="server-problem-tabs"
        role="group"
        aria-label="Lesson practice"
      >
        {lesson.problems.map((p) => (
          <button
            className={`btn ${chosen === p.id ? "" : "secondary"}`}
            aria-pressed={chosen === p.id}
            key={p.id}
            onClick={() => setSelected(p.id)}
          >
            {state.data?.completedProblems.some((c) => c.problemId === p.id)
              ? "✓ "
              : ""}
            {p.title}
          </button>
        ))}
      </div>
      {state.error && <Load error={state.error} retry={state.reload} />}{" "}
      {chosen && (
        <ProblemWorkspace
          key={chosen}
          id={chosen}
          onAccepted={() => setVersion((v) => v + 1)}
        />
      )}
    </>
  );
}
export function ServerProblems({ id }: { id?: string }) {
  const resource = useResource(() => api.problems(), "problems");
  const [difficulty, setDifficulty] = useState("");
  const [topic, setTopic] = useState("");
  if (id)
    return (
      <>
        <a className="text-link" href="#algorithms">
          ← All challenges
        </a>
        <ProblemWorkspace key={id} id={id} />
      </>
    );
  const problems = resource.data?.problems ?? [];
  return (
    <>
      <Heading
        title="Train your problem-solving."
        description="Python challenges with real test cases. Submit the complete function, including its definition."
      />
      <div className="server-filters">
        <label>
          Difficulty
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="">All difficulties</option>
            {["EASY", "MEDIUM", "HARD"].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <label>
          Topic
          <select value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="">All topics</option>
            {[...new Set(problems.map((p) => p.topicSlug))].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>
      {!resource.data ? (
        <Load error={resource.error} retry={resource.reload} />
      ) : (
        <div className="server-card-grid">
          {problems
            .filter(
              (p) =>
                (!difficulty || p.difficulty === difficulty) &&
                (!topic || p.topicSlug === topic),
            )
            .map((p) => (
              <Card
                key={p.id}
                href={`#algorithms/${p.id}`}
                title={p.title}
                detail={`${p.difficulty} · ${p.topicSlug}`}
              >
                <p>{p.statement}</p>
                <p>
                  {p.rewardXp} XP · {p.rewardCoins} coins on first completion
                </p>
              </Card>
            ))}
        </div>
      )}
      {resource.data &&
        !problems.some(
          (p) =>
            (!difficulty || p.difficulty === difficulty) &&
            (!topic || p.topicSlug === topic),
        ) && <Notice>No challenges match these filters yet.</Notice>}
    </>
  );
}
function ProblemWorkspace({
  id,
  onAccepted,
}: {
  id: string;
  onAccepted?: () => void;
}) {
  const { user, retry } = useAuth();
  const resource = useResource(() => api.problem(id), id);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<api.Verdict>();
  const [error, setError] = useState("");
  useEffect(() => {
    if (resource.data) setCode(resource.data.problem.starterCode);
  }, [resource.data]);
  useEffect(() => {
    setResult(undefined);
    setError("");
  }, [user?.id]);
  const p = resource.data?.problem;
  async function submit() {
    setBusy(true);
    setError("");
    setResult(undefined);
    try {
      const verdict = await api.submit(id, code);
      setResult(verdict);
      await retry();
      if (verdict.status === "ACCEPTED") onAccepted?.();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (!p) return <Load error={resource.error} retry={resource.reload} />;
  return (
    <section className="server-workspace">
      <div className="panel">
        <span className="tag">{p.difficulty} · Python</span>
        <h2>{p.title}</h2>
        <p>{p.statement}</p>
        <h3>Example</h3>
        {p.examples.map((e, i) => (
          <pre key={i}>
            <code>{`${p.functionName}(${e.args.map((a) => JSON.stringify(a)).join(", ")})\nExpected: ${JSON.stringify(e.expected)}`}</code>
          </pre>
        ))}
        <Notice>
          Return the result from your function. All sample and hidden tests must
          pass. First completion: {p.rewardXp} XP and {p.rewardCoins} coins.
        </Notice>
      </div>
      <div>
        <Editor title="solution.py" value={code} onChange={setCode} />
        {!user ? (
          <Gate />
        ) : (
          <button
            className="btn"
            disabled={busy || !code.trim()}
            onClick={() => void submit()}
          >
            {busy ? "Running tests…" : "Submit Python solution"}
          </button>
        )}
        {busy && (
          <p role="status">Your code is running in an isolated environment.</p>
        )}
        {error && (
          <div className="result error" role="alert">
            {error}
          </div>
        )}
        {result && (
          <div
            className={`result ${result.status === "ACCEPTED" ? "" : "error"}`}
            role="status"
          >
            <strong>{result.status.replaceAll("_", " ")}</strong> ·{" "}
            {result.passedCases}/{result.totalCases} tests passed.
            <br />
            {result.rewarded
              ? `+${result.earnedXp} XP · +${result.earnedCoins} coins`
              : result.status === "ACCEPTED"
                ? "Already completed. No duplicate rewards."
                : "No rewards awarded. Revise your function and try again."}
          </div>
        )}
      </div>
    </section>
  );
}
export function ServerCopy() {
  const { user, retry } = useAuth();
  const resource = useResource(() => api.copies(), "copies");
  const [selected, setSelected] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const detail = useResource(
    () => (selected ? api.copy(selected) : Promise.resolve(undefined)),
    selected,
  );
  const state = useResource(
    () => (user ? api.copyProgress() : Promise.resolve({ completed: [] })),
    `${user?.id}-${version}`,
  );
  useEffect(() => {
    setCode("");
    setMessage("");
    setError("");
  }, [selected, user?.id]);
  async function submit() {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const v = await api.submitCopy(selected, code);
      setMessage(
        v.isExact
          ? v.rewarded
            ? `Exact match! +${v.earnedXp} XP · +${v.earnedCoins} coins`
            : "Exact match! Already rewarded."
          : "Not an exact match. Check indentation, spaces and the final newline.",
      );
      await retry();
      setVersion((v) => v + 1);
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        title="Find your coding rhythm."
        description="Reproduce the reference exactly. Spaces, indentation and the final newline count."
      />
      {!resource.data ? (
        <Load error={resource.error} retry={resource.reload} />
      ) : (
        <div className="server-problem-tabs">
          {resource.data.exercises.map((e) => (
            <button
              key={e.id}
              className={`btn ${selected === e.id ? "" : "secondary"}`}
              onClick={() => setSelected(e.id)}
            >
              {state.data?.completed.some((c) => c.exerciseId === e.id)
                ? "✓ "
                : ""}
              {e.title}
            </button>
          ))}
        </div>
      )}
      {!selected ? (
        <Notice>Choose an exercise to begin.</Notice>
      ) : !detail.data ? (
        <Load error={detail.error} retry={detail.reload} />
      ) : (
        <section className="server-workspace">
          <div className="panel">
            <h2>{detail.data.exercise.title}</h2>
            <p>{detail.data.exercise.description}</p>
            <pre aria-label="Reference code">
              <code>{detail.data.exercise.templateCode}</code>
            </pre>
          </div>
          <div>
            <Editor
              title="practice.py"
              value={code}
              onChange={setCode}
              smartEditing={false}
            />
            {user ? (
              <button
                className="btn"
                disabled={busy || !code}
                onClick={() => void submit()}
              >
                {busy ? "Checking…" : "Check exact match"}
              </button>
            ) : (
              <Gate />
            )}
            {message && (
              <p className="result" role="status">
                {message}
              </p>
            )}
            {error && (
              <p className="result error" role="alert">
                {error}
              </p>
            )}
          </div>
        </section>
      )}
      {state.error && <Load error={state.error} retry={state.reload} />}
    </>
  );
}
