import { useState, useEffect } from "react";
import { snippets } from "../lib/data";
import { typingStats } from "../lib/progress.mjs";
import { useStore } from "../lib/store";
import { Heading, Editor, Notice } from "../components/UI";
export default function Copy() {
  const { state, reward } = useStore();
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [start, setStart] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const snippet = snippets[index];
  const stats = typingStats(snippet.code, value);
  useEffect(() => {
    if (!start || stats.complete) return;
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - start) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [start, stats.complete]);
  function reset(next = index) {
    setIndex(next);
    setValue("");
    setStart(null);
    setElapsed(0);
    setSubmitted(false);
  }
  return (
    <>
      <Heading
        title="Find your coding rhythm."
        description="Train your accuracy. Get comfortable with the language."
      >
        <select
          aria-label="Typing exercise"
          value={index}
          onChange={(e) => reset(Number(e.target.value))}
        >
          {snippets.map((s, i) => (
            <option key={s.id} value={i}>
              {s.title}
            </option>
          ))}
        </select>
      </Heading>
      <div className="typing-stats">
        <div>
          <small>ACCURACY</small>
          <strong>
            {value.length ? (
              <>
                {stats.accuracy}
                <span>%</span>
              </>
            ) : (
              <span className="stat-empty">Start typing</span>
            )}
          </strong>
        </div>
        <div>
          <small>PROGRESS</small>
          <strong>
            {stats.progress}
            <span>%</span>
          </strong>
        </div>
        <div>
          <small>TIME</small>
          <strong>
            {Math.floor(elapsed / 60)
              .toString()
              .padStart(2, "0")}
            :{(elapsed % 60).toString().padStart(2, "0")}
          </strong>
        </div>
        <div>
          <small>SPEED</small>
          <strong>
            {elapsed ? Math.round((value.length / elapsed) * 60) : 0}
            <span> chars/min</span>
          </strong>
        </div>
      </div>
      <div className="typing-progress">
        <div className="progress">
          <span style={{ width: `${stats.progress}%` }} />
        </div>
        <span>
          {value.length} / {snippet.code.length} characters typed
        </span>
      </div>
      <div className="two-cols">
        <section className="panel">
          <div className="section-head">
            <h2>{snippet.title}</h2>
            <span className="tag">{snippet.language}</span>
          </div>
          <p className="muted">
            Recreate the sample exactly, including spaces and line breaks.
          </p>
          <pre className="code code-reference" aria-label="Reference code">
            {snippet.code.split("").map((char, i) => (
              <span
                className={
                  i < value.length
                    ? char === value[i]
                      ? "char-correct"
                      : "char-wrong"
                    : ""
                }
                key={i}
              >
                {char}
              </span>
            ))}
          </pre>
          <Notice>
            Build muscle memory here. Explore Lessons and Challenges to develop
            your problem-solving skills.
          </Notice>
        </section>
        <section>
          <Editor
            title="practice.txt"
            value={value}
            smartEditing={false}
            placeholder="Type the snippet here. Spaces, capitalization and line breaks all count."
            onChange={(v) => {
              if (!start) setStart(Date.now());
              setValue(v);
              setSubmitted(false);
            }}
          />
          <div className="inline-actions">
            <button
              className="btn"
              disabled={!stats.complete || submitted}
              onClick={() => {
                reward(`copy:${snippet.id}`, 20, 5);
                setSubmitted(true);
              }}
            >
              Complete exercise
            </button>
            <button className="btn secondary" onClick={() => reset()}>
              Start over
            </button>
          </div>
          <div role="status">
            {submitted ? (
              <div className="result">
                Perfect match. Exercise complete! Preview rewards are granted
                once per exercise.
              </div>
            ) : stats.complete ? (
              <div className="result">
                Every character matches. You can save your result.
              </div>
            ) : (
              <p className="screen-label">
                {state.completed.includes(`copy:${snippet.id}`)
                  ? "You have already earned the reward for this exercise."
                  : "First completion: +20 XP · +5 coins."}
              </p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
