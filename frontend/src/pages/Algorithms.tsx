import { useState } from "react";
import { problems, difficultyNames } from "../lib/data";
import { useStore } from "../lib/store";
import { Heading, Editor, Notice, Icon } from "../components/UI";
export default function Algorithms({ id }: { id?: string }) {
  const { state, draft } = useStore();
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const problem = problems.find((p) => p.id === id);
  if (id && !problem)
    return (
      <>
        <Heading
          title="Challenge not found"
          description="Pick a challenge from the library."
        />
        <a href="#algorithms" className="btn">
          Back to challenges
        </a>
      </>
    );
  if (problem)
    return (
      <>
        <Heading
          title={problem.title}
          description={`${problem.topic} / ${difficultyNames[problem.difficulty]}`}
        >
          <a className="btn secondary" href="#algorithms">
            ← Challenges
          </a>
        </Heading>
        <div className="two-cols">
          <section className="panel">
            <span className={`difficulty ${problem.difficulty}`}>
              {difficultyNames[problem.difficulty]}
            </span>
            <h2 style={{ marginTop: 18 }}>The challenge</h2>
            <p className="theory-text">{problem.description}</p>
            <h3>Input</h3>
            <pre className="code">{problem.input}</pre>
            <h3>Expected output</h3>
            <pre className="code">{problem.output}</pre>
            <Notice>
              Use this example to understand the problem. Full test evaluation
              is coming soon.
            </Notice>
          </section>
          <section>
            <Editor
              value={state.drafts[problem.id] ?? problem.starter}
              onChange={(code) => draft(problem.id, code)}
            />
            <div className="inline-actions">
              <button
                className="btn"
                disabled
                title="Code evaluation is not available yet"
              >
                Submit solution
              </button>
              <span className="muted">Draft saved on this device</span>
            </div>
            <p className="screen-label">
              Write and save your solution. Running tests and submitting for
              evaluation are not available in this preview.
            </p>
          </section>
        </div>
      </>
    );
  const filtered = problems.filter(
    (p) =>
      (topic === "all" || p.topic === topic) &&
      (difficulty === "all" || p.difficulty === difficulty) &&
      p.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  return (
    <>
      <Heading
        title="A new way to think."
        description="Build your problem-solving instincts, one challenge at a time."
      >
        <span className="date-pill">{problems.length} practice problems</span>
      </Heading>
      <div className="panel">
        <div className="filters">
          <input
            aria-label="Search challenges"
            placeholder="Search challenges…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            aria-label="Topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          >
            <option value="all">All topics</option>
            {[...new Set(problems.map((p) => p.topic))].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select
            aria-label="Difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="all">All difficulties</option>
            {Object.entries(difficultyNames).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <table className="problem-list">
          <thead>
            <tr>
              <th>CHALLENGE</th>
              <th>TOPIC</th>
              <th>DIFFICULTY</th>
              <th>
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td>
                  <a className="problem-title" href={`#algorithms/${p.id}`}>
                    {p.title}
                  </a>
                  <p className="problem-desc">{p.description}</p>
                </td>
                <td>
                  <span className="topic-pill">{p.topic}</span>
                </td>
                <td>
                  <span className={`difficulty ${p.difficulty}`}>
                    {difficultyNames[p.difficulty]}
                  </span>
                </td>
                <td>
                  <a
                    className="problem-open"
                    href={`#algorithms/${p.id}`}
                    aria-label={`${p.title} — open`}
                  >
                    Open <Icon name="arrow" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <div className="empty">
            No challenges match these filters.
            <br />
            <button
              className="btn secondary"
              onClick={() => {
                setSearch("");
                setTopic("all");
                setDifficulty("all");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </>
  );
}
