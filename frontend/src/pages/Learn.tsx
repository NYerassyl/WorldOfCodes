import { useAuth } from "../lib/auth";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  PASS_MARK,
  correctFor,
  difficultyFor,
  firstUnfinished,
  getLanguage,
  getLesson,
  isLessonPassed,
  labKey,
  languages,
  lessonKey,
  trackProgress,
  type LabCheckResult,
  type Language,
  type Lesson,
} from "../lib/curriculum";
import { evaluateLab } from "../lib/labRunner";
import { buildRenderDocument } from "../lib/renderCheck";
import { useStore } from "../lib/store";
import { Heading, Notice, Icon } from "../components/UI";

function Missing({ title, body }: { title: string; body: string }) {
  return (
    <>
      <Heading title={title} description={body} />
      <a href="#learn" className="btn">
        Back to lessons <Icon name="arrow" />
      </a>
    </>
  );
}

function LanguagePicker() {
  const { user } = useAuth();
  const { state } = useStore();
  return (
    <>
      <Heading
        title="Choose your language."
        description="Python foundations with verified rewards, plus five tracks for local practice."
      >
        <span className="lesson-summary">Python syncs with your account</span>
      </Heading>
      <div className="language-grid">
        {languages.map((language) => {
          const isPython = language.id === "python";
          const count = isPython ? 6 : language.lessons.length;
          const done = isPython
            ? (user?.completedLessons ?? 0)
            : trackProgress(state.practice, language);
          const next = firstUnfinished(state.practice, language);
          return (
            <a
              className="language-card"
              data-lang={language.id}
              href={`#learn/${language.id}`}
              key={language.id}
            >
              <div className="language-card-top">
                <span className="language-badge">{language.badge}</span>
                <span className="tag">{count} lessons</span>
              </div>
              <h2>{language.name}</h2>
              <p>{language.tagline}</p>
              <div className="language-progress">
                <div className="progress">
                  <span
                    style={{
                      width: `${(done / count) * 100}%`,
                    }}
                  />
                </div>
                <small>
                  {done} of {count} lessons passed
                </small>
              </div>
              <div className="language-card-foot">
                <span>
                  {isPython
                    ? "Open Python foundations"
                    : done
                      ? `Continue: ${next.title}`
                      : `Start with ${language.lessons[0].title}`}
                </span>
                <span className="round-arrow">
                  <Icon name="arrow" />
                </span>
              </div>
            </a>
          );
        })}
      </div>
      <Notice>
        Pick any language at any time. Quiz answers and code-lab drafts are
        saved in this browser. Only verified Python and typing exercises earn
        account XP and coins.
      </Notice>
    </>
  );
}

function LanguageTrack({ language }: { language: Language }) {
  const { state } = useStore();
  const done = trackProgress(state.practice, language);
  const next = firstUnfinished(state.practice, language);
  return (
    <>
      <Heading
        title={`${language.name} lessons.`}
        description={language.description}
      >
        <a href="#learn" className="btn secondary">
          ← All languages
        </a>
      </Heading>
      <div className="learning-intro">
        <span className="language-icon" data-lang={language.id}>
          {language.badge}
        </span>
        <div className="learning-intro-copy">
          <h2>{language.name}</h2>
          <p>
            {language.lessons.length} lessons · 10 quiz tasks + 1 code lab each
            · {PASS_MARK} correct quiz tasks needed
          </p>
        </div>
        <div className="course-progress">
          <span>
            <b>{done}</b> of {language.lessons.length} lessons passed
          </span>
          <div className="progress">
            <span
              style={{ width: `${(done / language.lessons.length) * 100}%` }}
            />
          </div>
        </div>
        <a className="btn" href={`#learn/${language.id}/${next.id}`}>
          {done ? "Continue" : "Start"} <Icon name="arrow" />
        </a>
      </div>
      <div className="lesson-list">
        {language.lessons.map((lesson, index) => {
          const correct = correctFor(state.practice, language.id, lesson);
          const passed = correct >= PASS_MARK;
          const locked =
            index > 0 &&
            !isLessonPassed(
              state.practice,
              language.id,
              language.lessons[index - 1],
            );
          return (
            <article
              className={`lesson-row${passed ? " done" : ""}${locked ? " locked" : ""}`}
              key={lesson.id}
            >
              <span className="lesson-number">
                {passed ? "✓" : String(index + 1).padStart(2, "0")}
              </span>
              <div className="lesson-copy">
                <h3>{lesson.title}</h3>
                <p>{lesson.summary}</p>
                <span className="lesson-task-count">
                  {correct} of {lesson.tasks.length} quiz tasks correct
                  {passed
                    ? " · Passed"
                    : locked
                      ? ""
                      : ` · ${Math.max(0, PASS_MARK - correct)} more to pass`}
                </span>
                {locked && (
                  <span className="lesson-locked-note">
                    Pass the previous lesson to unlock
                  </span>
                )}
              </div>
              {locked ? (
                <span className="lesson-status locked">Locked</span>
              ) : passed ? (
                <a
                  className="lesson-status done"
                  href={`#learn/${language.id}/${lesson.id}`}
                >
                  Passed · Review
                </a>
              ) : (
                <a
                  className="btn secondary"
                  href={`#learn/${language.id}/${lesson.id}`}
                >
                  {correct ? "Continue" : "Start"} <Icon name="arrow" />
                </a>
              )}
            </article>
          );
        })}
      </div>
      <div className="learning-extra">
        <a className="practice-card" href="#algorithms">
          <span>&lt;/&gt;</span>
          <div>
            <h3>Apply what you learned</h3>
            <p>Open the challenge catalog</p>
          </div>
          <b>↗</b>
        </a>
        <Notice>
          Each lesson has a lecture, ten quiz tasks and one code lab. Five
          correct quiz answers unlock the next lesson; the lab is extra practice
          you can finish at your own pace.
        </Notice>
      </div>
    </>
  );
}

function LessonView({
  language,
  lesson,
}: {
  language: Language;
  lesson: Lesson;
}) {
  const { state, completeTask, completeLab, draft, reward } = useStore();
  const key = lessonKey(language.id, lesson.id);
  const lab = lesson.lab;
  const labDone = lab
    ? state.labs.includes(labKey(language.id, lesson.id, lab.id))
    : false;
  const index = language.lessons.indexOf(lesson);
  const previous = index > 0 ? language.lessons[index - 1] : null;
  const correct = correctFor(state.practice, language.id, lesson);
  const passed = correct >= PASS_MARK;
  const stored = state.practice[key] ?? [];
  const [tab, setTab] = useState("theory");
  const [current, setCurrent] = useState(() => {
    const nextTask = lesson.tasks.findIndex(
      (_, taskIndex) => !stored.includes(taskIndex),
    );
    return nextTask === -1 ? 0 : nextTask;
  });
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [labResults, setLabResults] = useState<LabCheckResult[]>([]);
  const [labStatus, setLabStatus] = useState<
    "idle" | "running" | "done" | "failed" | "unavailable"
  >("idle");
  const [labMessage, setLabMessage] = useState("");
  const [labAwarded, setLabAwarded] = useState(false);
  const [labOutput, setLabOutput] = useState<{
    stdout: string;
    stderr: string;
    compileError: string;
    verdict: string;
  } | null>(null);
  const labAbort = useRef<AbortController | null>(null);
  const task = lesson.tasks[current];
  const taskDone = stored.includes(current);
  const showResult = checked || taskDone;
  const nextLesson = language.lessons[index + 1];
  const labKeyValue = lab ? labKey(language.id, lesson.id, lab.id) : "";
  const labDraft = lab ? (state.drafts[labKeyValue] ?? lab.starter) : "";
  const labChecks = lab?.tests ?? lab?.renderChecks ?? [];
  const labIsRender = Boolean(lab?.renderChecks?.length);
  const labPreview = useMemo(
    () =>
      lab && labIsRender ? buildRenderDocument(language.id, lab, labDraft) : "",
    [lab, labIsRender, language.id, labDraft],
  );

  useEffect(() => {
    if (passed && !state.completed.includes(key)) reward(key, 40, 15);
  }, [passed, key, state.completed, reward]);

  useEffect(() => () => labAbort.current?.abort(), []);

  if (previous && !isLessonPassed(state.practice, language.id, previous)) {
    return (
      <Missing
        title="Lesson locked."
        body={`Pass ${previous.title} with at least ${PASS_MARK} correct tasks to open this lesson.`}
      />
    );
  }

  function goToTask(taskIndex: number) {
    setCurrent(taskIndex);
    setSelected(null);
    setChecked(false);
  }

  function choose(optionIndex: number) {
    if (taskDone) return;
    setSelected(optionIndex);
    setChecked(false);
  }

  function check() {
    if (selected === null || taskDone) return;
    setChecked(true);
    if (selected === task.answer) completeTask(key, current);
  }

  function resetLabOutput() {
    labAbort.current?.abort();
    setLabResults([]);
    setLabOutput(null);
    setLabMessage("");
    setLabAwarded(false);
    setLabStatus("idle");
  }

  function editLab(value: string) {
    draft(labKeyValue, value);
    resetLabOutput();
  }

  async function checkLab() {
    if (!lab) return;
    labAbort.current?.abort();
    const controller = new AbortController();
    labAbort.current = controller;
    setLabStatus("running");
    setLabResults([]);
    setLabMessage("");
    setLabAwarded(false);
    setLabOutput(null);
    const evaluation = await evaluateLab(
      language.id,
      lab,
      labDraft,
      controller.signal,
    );
    if (controller.signal.aborted) return;
    if (evaluation.status === "unavailable") {
      setLabStatus("unavailable");
      setLabMessage(evaluation.message);
      return;
    }
    const accepted =
      evaluation.results.length > 0 &&
      evaluation.results.every((result) => result.pass);
    setLabResults(evaluation.results);
    setLabOutput({
      stdout: evaluation.stdout,
      stderr: evaluation.stderr,
      compileError: evaluation.compileError,
      verdict: evaluation.verdict,
    });
    setLabStatus(accepted ? "done" : "failed");
    if (accepted && !labDone) {
      setLabAwarded(true);
      completeLab(labKeyValue);
    }
  }

  return (
    <>
      <Heading
        title={lesson.title}
        description={`${language.name} / Lesson ${index + 1} of ${language.lessons.length}`}
      >
        <a href={`#learn/${language.id}`} className="btn secondary">
          ← {language.name} lessons
        </a>
      </Heading>
      <div className="lesson-progress-strip">
        <span>
          {passed
            ? "Lesson passed"
            : `${correct} of ${PASS_MARK} required quiz tasks correct`}
        </span>
        <div className="progress">
          <span
            style={{ width: `${Math.min(100, (correct / PASS_MARK) * 100)}%` }}
          />
        </div>
        <small>{correct} / 10 quiz tasks correct</small>
      </div>
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
              02 Quiz · {correct}/10
            </button>
            {lab && (
              <button
                role="tab"
                aria-selected={tab === "lab"}
                className={tab === "lab" ? "selected" : ""}
                onClick={() => setTab("lab")}
              >
                03 Code lab{labDone ? " ✓" : ""}
              </button>
            )}
          </div>
          {tab === "theory" ? (
            <>
              <span className="eyebrow">UNDERSTAND THE CONCEPT</span>
              <h2>{lesson.title}</h2>
              <p className="theory-text">{lesson.summary}</p>
              {lesson.objectives && (
                <ul className="lesson-objectives">
                  {lesson.objectives.map((objective) => (
                    <li key={objective}>{objective}</li>
                  ))}
                </ul>
              )}
              <div className="theory-blocks">
                {lesson.theory.map((block) => (
                  <article className="theory-block" key={block.title}>
                    <h3>{block.title}</h3>
                    <p>{block.body}</p>
                    {block.code && <pre className="code">{block.code}</pre>}
                  </article>
                ))}
              </div>
              {lesson.terms && (
                <section className="term-list">
                  <h3>Key terms</h3>
                  <dl>
                    {lesson.terms.map((term) => (
                      <div key={term.term}>
                        <dt>{term.term}</dt>
                        <dd>{term.meaning}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}
              {lesson.pitfall && (
                <div className="pitfall">
                  <strong>Common mistake</strong>
                  <p>{lesson.pitfall}</p>
                </div>
              )}
              <div className="inline-actions">
                <button className="btn" onClick={() => setTab("practice")}>
                  Start quiz <Icon name="arrow" />
                </button>
                {lab && (
                  <button
                    className="btn secondary"
                    onClick={() => setTab("lab")}
                  >
                    Open code lab
                  </button>
                )}
              </div>
            </>
          ) : tab === "practice" ? (
            <>
              <div className="task-head">
                <span className="eyebrow">
                  TASK {String(current + 1).padStart(2, "0")} / 10
                </span>
                <span className="task-level">{difficultyFor(current)}</span>
              </div>
              <h2 className="task-question">{task.prompt}</h2>
              {task.code && <pre className="code task-code">{task.code}</pre>}
              <div
                className="choices"
                role="radiogroup"
                aria-label="Answer options"
              >
                {task.options.map((option, optionIndex) => {
                  const correctOption =
                    showResult && optionIndex === task.answer;
                  const wrongOption =
                    showResult &&
                    selected === optionIndex &&
                    optionIndex !== task.answer;
                  return (
                    <label
                      className={`choice${selected === optionIndex ? " picked" : ""}${correctOption ? " correct" : ""}${wrongOption ? " incorrect" : ""}`}
                      key={optionIndex}
                    >
                      <input
                        type="radio"
                        name={`task-${current}`}
                        checked={
                          taskDone
                            ? optionIndex === task.answer
                            : selected === optionIndex
                        }
                        onChange={() => choose(optionIndex)}
                        disabled={taskDone}
                      />
                      <span>{option}</span>
                    </label>
                  );
                })}
              </div>
              <div className="inline-actions">
                <button
                  className="btn"
                  disabled={selected === null || taskDone}
                  onClick={check}
                >
                  Check answer
                </button>
                {taskDone && current < lesson.tasks.length - 1 && (
                  <button
                    className="btn secondary"
                    onClick={() => goToTask(current + 1)}
                  >
                    Next task <Icon name="arrow" />
                  </button>
                )}
                {taskDone && current === lesson.tasks.length - 1 && !passed && (
                  <span className="muted">
                    Open any task and answer more to reach {PASS_MARK} correct.
                  </span>
                )}
              </div>
              {showResult && (
                <div
                  role="status"
                  className={`result${taskDone ? "" : " error"}`}
                >
                  {taskDone
                    ? `Correct. ${task.explanation}`
                    : `Not quite. ${task.explanation} Try again.`}
                </div>
              )}
              {passed && (
                <div className="lesson-pass">
                  <span className="tag">Lesson passed ✓</span>
                  <p>
                    Local practice completed.{" "}
                    {nextLesson
                      ? "The next lesson is now unlocked."
                      : "You finished this language track."}
                  </p>
                  {nextLesson ? (
                    <a
                      className="btn"
                      href={`#learn/${language.id}/${nextLesson.id}`}
                    >
                      Next lesson <Icon name="arrow" />
                    </a>
                  ) : (
                    <a className="btn" href="#learn">
                      Choose another language <Icon name="arrow" />
                    </a>
                  )}
                </div>
              )}
              <div className="task-dots" aria-label="Task navigator">
                {lesson.tasks.map((_, taskIndex) => {
                  const done = stored.includes(taskIndex);
                  return (
                    <button
                      key={taskIndex}
                      className={`task-dot${done ? " correct" : ""}${taskIndex === current ? " current" : ""}`}
                      aria-label={`Task ${taskIndex + 1}${done ? ", correct" : ""}`}
                      aria-current={taskIndex === current ? "step" : undefined}
                      onClick={() => goToTask(taskIndex)}
                    >
                      {done ? "✓" : taskIndex + 1}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            lab && (
              <>
                <span className="eyebrow">HANDS-ON PRACTICE</span>
                <h2>{lab.title}</h2>
                <p className="theory-text">{lab.brief}</p>
                <div className="lab-meta">
                  <span className="tag">{lab.file}</span>
                  <span className="tag">
                    {labChecks.length}{" "}
                    {labIsRender ? "layout tests" : "automated tests"}
                  </span>
                  {labDone && <span className="tag">Lab complete ✓</span>}
                </div>
                <div className="lab-checks">
                  {labChecks.map((labCheck, checkIndex) => {
                    const result = labResults[checkIndex];
                    const mark =
                      labStatus === "running"
                        ? "…"
                        : result
                          ? result.pass
                            ? "✓"
                            : "×"
                          : String(checkIndex + 1).padStart(2, "0");
                    return (
                      <div
                        className={`lab-check${result ? (result.pass ? " pass" : " fail") : ""}`}
                        key={labCheck.label}
                      >
                        <span>{mark}</span>
                        <div>
                          {labCheck.label}
                          {result?.detail && (
                            <small className="lab-check-detail">
                              {result.detail}
                            </small>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <label className="lab-editor-label" htmlFor="lab-editor">
                  {labIsRender
                    ? "Your HTML / CSS"
                    : `Your ${language.name} code`}
                </label>
                <textarea
                  id="lab-editor"
                  className="lab-editor"
                  value={labDraft}
                  spellCheck={false}
                  rows={12}
                  onChange={(event) => editLab(event.target.value)}
                />
                {labIsRender && (
                  <div className="lab-preview">
                    <span className="lab-editor-label">Live preview</span>
                    <iframe
                      title="Lab preview"
                      sandbox="allow-same-origin"
                      srcDoc={labPreview}
                    />
                  </div>
                )}
                <div className="inline-actions">
                  <button
                    className="btn"
                    onClick={checkLab}
                    disabled={labStatus === "running"}
                  >
                    {labStatus === "running"
                      ? "Running…"
                      : labIsRender
                        ? "Run layout tests"
                        : "Run & check"}
                  </button>
                  <button
                    className="btn secondary"
                    onClick={() => {
                      draft(labKeyValue, lab.starter);
                      resetLabOutput();
                    }}
                  >
                    Reset to starter
                  </button>
                </div>
                {labStatus === "unavailable" && (
                  <div role="status" className="lab-result error">
                    <strong>Execution is unavailable right now.</strong>{" "}
                    {labMessage} Your code draft is saved, and no reward is
                    granted until a real run passes.
                  </div>
                )}
                {labStatus === "running" && (
                  <div role="status" className="lab-result">
                    {labIsRender
                      ? "Measuring the rendered page…"
                      : "Running your code in an isolated sandbox…"}
                  </div>
                )}
                {labStatus === "done" && (
                  <div role="status" className="lab-result pass">
                    <strong>
                      Accepted — all {labChecks.length} tests passed.
                    </strong>{" "}
                    {labAwarded
                      ? "Practice saved on this device."
                      : labDone
                        ? "This lab was already completed."
                        : ""}{" "}
                    {lab.explanation}
                  </div>
                )}
                {labStatus === "failed" && (
                  <div role="status" className="lab-result error">
                    <strong>Not accepted yet.</strong> Review the failing tests
                    and the output below, fix your code and run again.
                  </div>
                )}
                {labStatus === "idle" && labDone && (
                  <div role="status" className="lab-result pass">
                    You already completed this lab. {lab.explanation}
                  </div>
                )}
                {!labIsRender &&
                  labOutput &&
                  (labOutput.compileError ||
                    labOutput.stderr ||
                    labOutput.stdout ||
                    labOutput.verdict) && (
                    <div className="lab-output">
                      <div className="lab-output-head">
                        <span>
                          {labStatus === "done" && labChecks.length > 1
                            ? "Runner output · final test"
                            : "Runner output"}
                        </span>
                        <span>{labOutput.verdict}</span>
                      </div>
                      {labOutput.compileError && (
                        <pre className="compile">{labOutput.compileError}</pre>
                      )}
                      {labOutput.stderr && (
                        <pre className="stderr">{labOutput.stderr}</pre>
                      )}
                      {labOutput.stdout && <pre>{labOutput.stdout}</pre>}
                      {!labOutput.compileError &&
                        !labOutput.stderr &&
                        !labOutput.stdout && (
                          <pre className="muted">No output was produced.</pre>
                        )}
                    </div>
                  )}
                <details className="lab-hint">
                  <summary>Need a hint?</summary>
                  <p>{lab.hint}</p>
                </details>
                <p className="muted">
                  {labIsRender
                    ? "Layout tests inspect a real sandboxed rendering of your page in this browser. Scripts are blocked."
                    : "Your code and test input are sent to the public Judge0 CE sandbox at ce.judge0.com for real compilation and execution. Do not paste passwords, keys or private data."}
                </p>
              </>
            )
          )}
        </section>
        <aside className="panel lesson-aside">
          <div className="section-head">
            <h2>Quiz target</h2>
            <span className="tag">{language.name}</span>
          </div>
          <div className="practice-target">
            <strong>{correct} / 10</strong>
            <p>correct tasks</p>
            <div className="progress">
              <span style={{ width: `${(correct / 10) * 100}%` }} />
            </div>
            <small>
              {passed
                ? "Lesson passed"
                : `${Math.max(0, PASS_MARK - correct)} more correct to pass`}
            </small>
          </div>
          <div className="lesson-reward">
            <span>◈</span>
            <div>
              <strong>Local quiz progress</strong>
              <p>
                {state.completed.includes(key)
                  ? "You have completed this local lesson."
                  : `Complete ${PASS_MARK} of 10 quiz tasks to complete this lesson.`}
              </p>
            </div>
          </div>
          {lab && (
            <div className="lesson-reward">
              <span>⌘</span>
              <div>
                <strong>Local lab progress</strong>
                <p>
                  {labDone
                    ? "Code lab completed."
                    : "Pass every lab test to complete this practice."}
                </p>
              </div>
            </div>
          )}
          <Notice>
            Quiz answers and progress are saved in this browser. Only verified
            Python and typing exercises earn account XP and coins. Code-lab runs
            are sent to an external sandbox; account sync is coming later.
          </Notice>
        </aside>
      </div>
    </>
  );
}

export default function Learn({
  languageId,
  lessonId,
}: {
  languageId?: string;
  lessonId?: string;
}) {
  if (!languageId) return <LanguagePicker />;
  const language = getLanguage(languageId);
  if (!language) {
    return (
      <Missing
        title="Language not found."
        body="Choose one of the six available tracks to keep learning."
      />
    );
  }
  if (!lessonId) return <LanguageTrack language={language} />;
  const lesson = getLesson(language, lessonId);
  if (!lesson) {
    return (
      <Missing
        title="Lesson not found."
        body={`Choose a lesson from the ${language.name} track.`}
      />
    );
  }
  return <LessonView language={language} lesson={lesson} />;
}
