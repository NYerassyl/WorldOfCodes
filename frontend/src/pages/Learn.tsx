import { useEffect, useState } from "react";
import {
  PASS_MARK,
  correctFor,
  difficultyFor,
  firstUnfinished,
  getLanguage,
  getLesson,
  isLessonPassed,
  languages,
  lessonKey,
  trackProgress,
  type Language,
  type Lesson,
} from "../lib/curriculum";
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
  const { state } = useStore();
  const totalPassed = languages.reduce(
    (sum, language) => sum + trackProgress(state.practice, language),
    0,
  );
  const totalLessons = languages.reduce(
    (sum, language) => sum + language.lessons.length,
    0,
  );
  return (
    <>
      <Heading
        title="Choose your language."
        description="Six tracks. Ten practice tasks per lesson. Pass five to unlock the next one."
      >
        <span className="lesson-summary">
          {totalPassed} of {totalLessons} lessons passed
        </span>
      </Heading>
      <div className="language-grid">
        {languages.map((language) => {
          const done = trackProgress(state.practice, language);
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
                <span className="tag">{language.lessons.length} lessons</span>
              </div>
              <h2>{language.name}</h2>
              <p>{language.tagline}</p>
              <div className="language-progress">
                <div className="progress">
                  <span
                    style={{
                      width: `${(done / language.lessons.length) * 100}%`,
                    }}
                  />
                </div>
                <small>
                  {done} of {language.lessons.length} lessons passed
                </small>
              </div>
              <div className="language-card-foot">
                <span>
                  {done
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
        Pick any language at any time. Your task answers and lesson progress are
        saved in this browser.
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
            {language.lessons.length} lessons · 10 tasks each · {PASS_MARK}{" "}
            correct tasks needed
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
                  {correct} of {lesson.tasks.length} tasks correct
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
          Each lesson has ten tasks. Five correct answers complete the lesson;
          the next one unlocks automatically.
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
  const { state, completeTask, reward } = useStore();
  const key = lessonKey(language.id, lesson.id);
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
  const task = lesson.tasks[current];
  const taskDone = stored.includes(current);
  const showResult = checked || taskDone;
  const nextLesson = language.lessons[index + 1];

  useEffect(() => {
    if (passed && !state.completed.includes(key)) reward(key, 40, 15);
  }, [passed, key, state.completed, reward]);

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
            : `${correct} of ${PASS_MARK} required tasks correct`}
        </span>
        <div className="progress">
          <span
            style={{ width: `${Math.min(100, (correct / PASS_MARK) * 100)}%` }}
          />
        </div>
        <small>{correct} / 10 tasks correct</small>
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
              02 Practice · {correct}/10
            </button>
          </div>
          {tab === "theory" ? (
            <>
              <span className="eyebrow">UNDERSTAND THE CONCEPT</span>
              <h2>{lesson.title}</h2>
              <p className="theory-text">{lesson.summary}</p>
              <div className="theory-blocks">
                {lesson.theory.map((block) => (
                  <article className="theory-block" key={block.title}>
                    <h3>{block.title}</h3>
                    <p>{block.body}</p>
                    {block.code && <pre className="code">{block.code}</pre>}
                  </article>
                ))}
              </div>
              <button className="btn" onClick={() => setTab("practice")}>
                Start practice <Icon name="arrow" />
              </button>
            </>
          ) : (
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
                    +40 XP and +15 coins are granted once.{" "}
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
          )}
        </section>
        <aside className="panel lesson-aside">
          <div className="section-head">
            <h2>Practice target</h2>
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
              <strong>+40 XP · +15 coins</strong>
              <p>
                {state.completed.includes(key)
                  ? "You have earned this lesson reward."
                  : `Complete ${PASS_MARK} of 10 tasks to earn it once.`}
              </p>
            </div>
          </div>
          <Notice>
            Answers are checked instantly. Your preview progress is saved in
            this browser; account sync is coming later.
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
