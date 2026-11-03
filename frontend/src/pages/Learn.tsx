import { useState } from "react";
import { lessons } from "../lib/data";
import { useStore } from "../lib/store";
import { Heading, Editor, Notice, Icon } from "../components/UI";
const htmlStarter =
  '<style>\n  .card {\n    font-family: sans-serif;\n    padding: 28px;\n    background: #eaf0e3;\n    border-radius: 16px;\n    max-width: 260px;\n  }\n  h2 { color: #173e31; }\n</style>\n<article class="card">\n  <h2>My first world</h2>\n  <p>Every line is a new possibility.</p>\n</article>';
export default function Learn({ id }: { id?: string }) {
  const { state, reward, draft } = useStore();
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [tab, setTab] = useState("theory");
  if (id === "html")
    return (
      <>
        <Heading
          title="HTML & CSS Studio"
          description="Turn a visual idea into something you can build."
        />
        <div className="two-cols">
          <section className="panel">
            <span className="eyebrow">01 / BUILD A CARD</span>
            <h2>Structure first. Style second.</h2>
            <p className="muted">
              HTML defines content. CSS gives it a visual language. Use padding
              for inner space and border-radius for rounded corners. Try
              recreating the reference below.
            </p>
            <div className="target-card">
              <small>WORLD OF CODES</small>
              <h3>
                Your first
                <br />
                big idea.
              </h3>
              <span>Start building today ↗</span>
            </div>
            <h3>Your checklist</h3>
            <ul className="muted">
              <li>Background: #202126. Text: #ffffff.</li>
              <li>Padding: 28px. Border radius: 16px.</li>
              <li>Add a heading, description and link.</li>
            </ul>
            <Notice>
              An open practice space. Visual grading and rewards are not
              available yet.
            </Notice>
          </section>
          <section>
            <Editor
              title="index.html"
              value={state.drafts.html ?? htmlStarter}
              onChange={(code) => draft("html", code)}
            />
            <div className="preview-label">
              LIVE PREVIEW <span>Sandboxed output</span>
            </div>
            <iframe
              title="HTML and CSS preview"
              sandbox=""
              className="html-preview"
              srcDoc={`<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'none'; base-uri 'none'"></head><body>${state.drafts.html ?? htmlStarter}</body></html>`}
            />
          </section>
        </div>
      </>
    );
  const lesson = lessons.find((l) => l.id === id);
  if (id && !lesson)
    return (
      <>
        <Heading
          title="Lesson not found"
          description="Choose a lesson from your learning path."
        />
        <a href="#learn" className="btn">
          Back to lessons
        </a>
      </>
    );
  if (!lesson) {
    const finished = lessons.filter((l) =>
      state.completed.includes(l.id),
    ).length;
    const nextLesson =
      lessons.find((l) => !state.completed.includes(l.id)) || lessons[0];
    return (
      <>
        <Heading
          title="Small steps. Real skills."
          description="Understand the concept. Put it into practice. Keep going."
        />
        <div className="learning-intro">
          <span className="language-icon">JS</span>
          <div className="learning-intro-copy">
            <h2>JavaScript Foundations</h2>
            <p>6 lessons · Beginner friendly · At your pace</p>
          </div>
          <div className="course-progress">
            <span>
              <b>{finished}</b> of {lessons.length} lessons complete
            </span>
            <div className="progress">
              <span
                style={{ width: `${(finished / lessons.length) * 100}%` }}
              />
            </div>
          </div>
          <a className="btn" href={`#learn/${nextLesson.id}`}>
            {finished ? "Continue" : "Start"} <Icon name="arrow" />
          </a>
        </div>
        <div className="lesson-list">
          {lessons.map((l, i) => {
            const done = state.completed.includes(l.id),
              locked = i > 0 && !state.completed.includes(lessons[i - 1].id);
            return (
              <article
                className={`lesson-row${done ? " done" : ""}${locked ? " locked" : ""}`}
                key={l.id}
              >
                <span className="lesson-number">
                  {done ? "✓" : String(i + 1).padStart(2, "0")}
                </span>
                <div className="lesson-copy">
                  <h3>{l.title}</h3>
                  <p>{l.description}</p>
                  {locked && (
                    <span className="lesson-locked-note">
                      Finish the previous lesson to unlock
                    </span>
                  )}
                </div>
                {locked ? (
                  <span className="lesson-status locked">Locked</span>
                ) : done ? (
                  <a className="lesson-status done" href={`#learn/${l.id}`}>
                    Completed · Review
                  </a>
                ) : (
                  <a className="btn secondary" href={`#learn/${l.id}`}>
                    Start <Icon name="arrow" />
                  </a>
                )}
              </article>
            );
          })}
        </div>
        <div className="learning-extra">
          <a className="practice-card" href="#learn/html">
            <span>&lt;/&gt;</span>
            <div>
              <h3>HTML & CSS Studio</h3>
              <p>Build an interface from a reference</p>
            </div>
            <b>↗</b>
          </a>
          <Notice>
            More languages, OOP and DSA are planned for future chapters.
          </Notice>
        </div>
      </>
    );
  }
  const index = lessons.indexOf(lesson),
    locked = index > 0 && !state.completed.includes(lessons[index - 1].id);
  if (locked)
    return (
      <>
        <Heading
          title="One step at a time."
          description="Each lesson builds on the last. Finish the previous lesson to unlock this one."
        />
        <a href="#learn" className="btn">
          Open learning path
        </a>
      </>
    );
  const correct = selected === lesson.answer;
  const complete = state.completed.includes(lesson.id);
  return (
    <>
      <Heading
        title={lesson.title}
        description={`JavaScript Foundations / ${index + 1} · lesson`}
      >
        <a href="#learn" className="btn secondary">
          ← Learning Path
        </a>
      </Heading>
      <div className="two-cols">
        <section className="panel">
          <div className="tabbar" role="tablist" aria-label="Lesson section">
            <button
              role="tab"
              aria-selected={tab === "theory"}
              className={tab === "theory" ? "selected" : ""}
              onClick={() => setTab("theory")}
            >
              01 Theory
            </button>
            <button
              role="tab"
              aria-selected={tab === "practice"}
              className={tab === "practice" ? "selected" : ""}
              onClick={() => setTab("practice")}
            >
              02 Practice
            </button>
          </div>
          {tab === "theory" ? (
            <>
              <span className="eyebrow">UNDERSTAND THE CONCEPT</span>
              <h2>{lesson.title}</h2>
              <p className="theory-text">{lesson.theory}</p>
              <div className="code">{lesson.code}</div>
              <button className="btn" onClick={() => setTab("practice")}>
                Try it yourself →
              </button>
            </>
          ) : (
            <>
              <span className="eyebrow">PUT IT INTO PRACTICE</span>
              <h2>{lesson.question}</h2>
              <div className="choices">
                {lesson.choices.map((c, i) => (
                  <label
                    className={`choice${selected === i ? " picked" : ""}`}
                    key={i}
                  >
                    <input
                      type="radio"
                      name="answer"
                      checked={selected === i}
                      onChange={() => {
                        setSelected(i);
                        setChecked(false);
                      }}
                    />
                    <span>{c}</span>
                  </label>
                ))}
              </div>
              <button
                className="btn"
                disabled={selected === null}
                onClick={() => {
                  setChecked(true);
                  if (correct) reward(lesson.id);
                }}
              >
                Check answer
              </button>
              {checked && (
                <div
                  role="status"
                  className={`result${correct ? "" : " error"}`}
                >
                  {correct
                    ? `Exactly right! ${lesson.explanation}`
                    : "Not quite. Walk through the code one step at a time and try again."}
                </div>
              )}
              {checked && correct && (
                <div className="inline-actions">
                  <span className="tag">Lesson complete ✓</span>
                  {lessons[index + 1] ? (
                    <a
                      className="btn secondary"
                      href={`#learn/${lessons[index + 1].id}`}
                    >
                      Next lesson →
                    </a>
                  ) : (
                    <a className="btn secondary" href="#algorithms">
                      Explore challenges →
                    </a>
                  )}
                </div>
              )}
            </>
          )}
        </section>
        <aside className="panel lesson-aside">
          <div className="section-head">
            <h2>Follow the code</h2>
            <span className="tag">JavaScript</span>
          </div>
          <div className="editor">
            <div className="editor-head">lesson.js</div>
            <pre>{lesson.code}</pre>
          </div>
          <div className="lesson-reward">
            <span>◈</span>
            <div>
              <strong>+40 XP · +15 coins</strong>
              <p>
                {complete
                  ? "You have earned this lesson reward."
                  : "Preview reward for your first correct answer."}
              </p>
            </div>
          </div>
          <Notice>
            Your preview progress is saved in this browser. Account sync is
            coming later.
          </Notice>
        </aside>
      </div>
    </>
  );
}
