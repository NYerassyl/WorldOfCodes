import { useStore } from "../lib/store";
import { languages, firstUnfinished, trackProgress } from "../lib/curriculum";
import { levelFor } from "../lib/progress.mjs";
import { Icon } from "../components/UI";
import WorldArt from "../components/WorldArt";
export default function Home() {
  const { state } = useStore();
  const finished = languages.reduce(
    (sum, language) => sum + trackProgress(state.practice, language),
    0,
  );
  const totalLessons = languages.reduce(
    (sum, language) => sum + language.lessons.length,
    0,
  );
  const javascript = languages.find(
    (language) => language.id === "javascript",
  )!;
  const css = languages.find((language) => language.id === "css")!;
  const jsFinished = trackProgress(state.practice, javascript);
  const jsNext = firstUnfinished(state.practice, javascript);
  const cssFinished = trackProgress(state.practice, css);
  return (
    <>
      <div className="home-welcome">
        <div>
          <span className="eyebrow">YOUR DEVELOPER JOURNEY</span>
          <h1>
            Good to see you, <span>{state.name}.</span>
          </h1>
        </div>
        <a href="#profile" className="welcome-level">
          <Icon name="sparkle" />
          <span>
            Level {levelFor(state.xp)}
            <small>Just getting started</small>
          </span>
          <Icon name="arrow-up" />
        </a>
      </div>
      <section className="hero">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-copy">
          <div className="hero-eyebrow">
            <span>01</span> A NEW WORLD OF CODE
          </div>
          <h2>
            You don’t find
            <br />
            your potential.
            <br />
            <em>You build it.</em>
          </h2>
          <p>
            Learn the foundations. Sharpen your instincts.
            <br className="desktop-break" /> Turn every line of code into your
            next level.
          </p>
          <div className="hero-actions">
            <a className="btn" href="#learn">
              {finished ? "Continue learning" : "Start your journey"}
              <Icon name="arrow" />
            </a>
            <a className="hero-secondary" href="#algorithms">
              Explore challenges <Icon name="arrow-up" />
            </a>
          </div>
          <div className="hero-footnote">
            <span>
              <Icon name="check-circle" /> Learn by doing
            </span>
            <span>
              <Icon name="check-circle" /> At your own pace
            </span>
          </div>
        </div>
        <WorldArt />
      </section>
      <section className="stats" aria-label="Your progress">
        <div className="stat">
          <span className="stat-icon">
            <Icon name="bolt" />
          </span>
          <div>
            <small>Total experience</small>
            <strong>
              {state.xp}
              <span>XP</span>
            </strong>
          </div>
          <span className="stat-detail">Every step counts</span>
        </div>
        <div className="stat">
          <span className="stat-icon">
            <Icon name="learn" />
          </span>
          <div>
            <small>Lessons completed</small>
            <strong>
              {String(finished).padStart(2, "0")}
              <span>/ {String(totalLessons).padStart(2, "0")}</span>
            </strong>
          </div>
          <span className="stat-detail">Keep the momentum</span>
        </div>
        <div className="stat">
          <span className="stat-icon">
            <Icon name="flame" />
          </span>
          <div>
            <small>Active learning days</small>
            <strong>
              {String(Object.keys(state.activity).length).padStart(2, "0")}
              <span>days</span>
            </strong>
          </div>
          <span className="stat-detail">Show up for yourself</span>
        </div>
        <div className="stat">
          <span className="stat-icon">
            <Icon name="coin" />
          </span>
          <div>
            <small>Coin balance</small>
            <strong>
              {state.coins}
              <span>coins</span>
            </strong>
          </div>
          <span className="stat-detail">Earned by completing</span>
        </div>
      </section>
      <div className="home-main-grid">
        <section className="learning-section">
          <div className="section-head">
            <div>
              <span className="eyebrow">ONE STEP AT A TIME</span>
              <h2>Your lessons</h2>
            </div>
            <a className="text-link" href="#learn">
              View all lessons <Icon name="arrow-up" />
            </a>
          </div>
          <a className="track-card js-track" href="#learn/javascript">
            <div className="track-art">
              <span className="js-tile">JS</span>
              <span className="track-orbit orbit-one" />
              <span className="track-orbit orbit-two" />
              <span className="track-small-code">const future = you;</span>
            </div>
            <div className="track-body">
              <div className="track-top">
                <span className="tag">FOUNDATIONS</span>
                <span className="track-duration">
                  {javascript.lessons.length} lessons
                </span>
              </div>
              <h3>Speak JavaScript.</h3>
              <p>From your first variable to thinking in functions.</p>
              <div className="track-progress-row">
                <div className="progress">
                  <span
                    style={{
                      width: `${(jsFinished / javascript.lessons.length) * 100}%`,
                    }}
                  />
                </div>
                <span>
                  {Math.round((jsFinished / javascript.lessons.length) * 100)}%
                </span>
              </div>
              <div className="track-bottom">
                <span>
                  {jsFinished === javascript.lessons.length
                    ? "Completed · ready to review"
                    : `Up next: ${jsNext.title}`}
                </span>
                <span className="round-arrow">
                  <Icon name="arrow" />
                </span>
              </div>
            </div>
          </a>
          <a className="track-card css-track" href="#learn/css">
            <div className="track-art">
              <div className="mini-layout">
                <span />
                <span />
                <span />
                <span />
              </div>
              <span className="track-small-code">&lt;make-it-yours /&gt;</span>
            </div>
            <div className="track-body">
              <div className="track-top">
                <span className="tag">VISUAL LANGUAGE</span>
                <span className="track-duration">
                  {css.lessons.length} lessons
                </span>
              </div>
              <h3>Style with CSS.</h3>
              <p>From selectors to flexible, responsive layouts.</p>
              <div className="track-bottom">
                <span>
                  <Icon name="code" /> {cssFinished} of {css.lessons.length}{" "}
                  lessons passed
                </span>
                <span className="round-arrow">
                  <Icon name="arrow" />
                </span>
              </div>
            </div>
          </a>
        </section>
        <aside className="home-right">
          <div className="section-head">
            <div>
              <span className="eyebrow">PUT YOUR SKILLS TO WORK</span>
              <h2>A little competition.</h2>
            </div>
          </div>
          <article className="arena-card">
            <div className="arena-card-top">
              <span className="eyebrow">THE DUEL ARENA</span>
              <span className="arena-mode">
                1 <span>vs</span> 1
              </span>
            </div>
            <div className="arena-art" aria-hidden="true">
              <div className="arena-player player-you">
                <Icon name="code" />
                <span>YOU</span>
              </div>
              <span className="arena-versus">VS</span>
              <div className="arena-player player-rival">
                <Icon name="terminal" />
                <span>YOUR RIVAL</span>
              </div>
              <div className="arena-art-line" />
            </div>
            <h3>
              Same problem.
              <br />
              Different perspectives.
            </h3>
            <p>
              Find your focus in the arena.
              <br />
              Start with a solo rehearsal.
            </p>
            <a className="arena-link" href="#duel">
              Step into the arena <Icon name="arrow-up" />
            </a>
            <span className="arena-preview-note">
              <i /> Live battles coming soon
            </span>
          </article>
          <a className="friend-nudge" href="#friends">
            <span className="friend-icon">
              <Icon name="friends" />
            </span>
            <div>
              <strong>Better with a friend.</strong>
              <p>Explore friendly battles</p>
            </div>
            <Icon name="arrow-up" />
          </a>
        </aside>
      </div>
      <section className="practice-row">
        <div className="section-head">
          <div>
            <span className="eyebrow">FIND YOUR FLOW</span>
            <h2>A different way to practice.</h2>
          </div>
        </div>
        <div className="practice-grid">
          <a className="practice-card" href="#algorithms">
            <span className="practice-number">01</span>
            <div>
              <h3>Train your problem-solving.</h3>
              <p>Explore algorithms, one challenge at a time.</p>
            </div>
            <Icon name="arrow-up" />
          </a>
          <a className="practice-card" href="#copy">
            <span className="practice-number">02</span>
            <div>
              <h3>Get into a coding rhythm.</h3>
              <p>Build accuracy in the Typing Lab.</p>
            </div>
            <Icon name="arrow-up" />
          </a>
        </div>
      </section>
    </>
  );
}
