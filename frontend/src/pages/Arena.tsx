import { useEffect, useState } from "react";
import { useStore } from "../lib/store";
import { problems, difficultyNames } from "../lib/data";
import { Heading, Editor, Notice, Modal, Icon } from "../components/UI";
export default function Arena({ friendly = false }: { friendly?: boolean }) {
  const { state, draft } = useStore();
  const [topic, setTopic] = useState("Arrays");
  const [difficulty, setDifficulty] = useState("easy");
  const [active, setActive] = useState(false);
  const [deadline, setDeadline] = useState(0);
  const [remaining, setRemaining] = useState(900);
  const [modal, setModal] = useState(false);
  const [room, setRoom] = useState("");
  const [roomMessage, setRoomMessage] = useState("");
  const [roomTab, setRoomTab] = useState("create");
  const problem = problems.find(
    (p) => p.topic === topic && p.difficulty === difficulty,
  );
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(
      () =>
        setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))),
      500,
    );
    return () => clearInterval(timer);
  }, [active, deadline]);
  if (active && problem)
    return (
      <>
        <Heading
          title="Your practice arena"
          description="Solo rehearsal. No opponent or rating changes in this preview."
        >
          <span className="timer">
            ◷{" "}
            {Math.floor(remaining / 60)
              .toString()
              .padStart(2, "0")}
            :{(remaining % 60).toString().padStart(2, "0")}
          </span>
        </Heading>
        <div className="match-strip">
          <span className="avatar small">{state.avatar}</span>
          <strong>{state.name}</strong>
          <span>VS</span>
          <span className="avatar small ghost">?</span>
          <strong>No opponent connected</strong>
          <button className="btn secondary" onClick={() => setModal(true)}>
            End rehearsal
          </button>
        </div>
        {remaining === 0 && (
          <div className="result" role="status">
            Time is up. Your draft is saved. No match result is recorded.
          </div>
        )}
        <div className="two-cols">
          <section className="panel">
            <span className={`difficulty ${problem.difficulty}`}>
              {difficultyNames[problem.difficulty]}
            </span>
            <h2 style={{ marginTop: 20 }}>{problem.title}</h2>
            <p>{problem.description}</p>
            <pre className="code">
              Input: {problem.input}
              {"\n"}Output: {problem.output}
            </pre>
            <Notice>
              Practice writing your solution. Code evaluation is not available
              in this preview.
            </Notice>
          </section>
          <section>
            <Editor
              value={state.drafts[`arena:${problem.id}`] ?? problem.starter}
              onChange={(v) => draft(`arena:${problem.id}`, v)}
            />
            <div className="inline-actions">
              <button className="btn" disabled>
                Submit solution
              </button>
              <span className="muted">Live evaluation coming soon</span>
            </div>
          </section>
        </div>
        {modal && (
          <Modal
            title="Finish this practice session?"
            onClose={() => setModal(false)}
          >
            <p>
              Your code draft stays saved in this browser. Your rating will not
              change.
            </p>
            <button
              className="btn"
              onClick={() => {
                setActive(false);
                setModal(false);
              }}
            >
              Finish session
            </button>
          </Modal>
        )}
      </>
    );
  return (
    <>
      <Heading
        title={friendly ? "Better with a rival." : "Meet your next challenge."}
        description={
          friendly
            ? "Challenge a friend. Learn from each other."
            : "Pick your topic. Set your difficulty. Find your focus."
        }
      />
      <div className="two-cols">
        <section className="panel">
          <span className="eyebrow">
            {friendly ? "FRIENDLY MATCH" : "SOLO · 1 VS 1"}
          </span>
          <div className="arena-stage">
            <div className="arena-symbol">
              <Icon name={friendly ? "friends" : "duel"} />
            </div>
            <h2>
              {friendly
                ? "A little friendly competition."
                : "One problem. Your best thinking."}
            </h2>
            <p className="muted">
              {friendly
                ? "Friendly matches never change your rating."
                : "Same problem. Same clock. Your solution."}
            </p>
            <div className="versus">
              <div>
                <span className={`avatar frame-${state.frame}`}>
                  {state.avatar}
                </span>
                <b>{state.name}</b>
                <small>You</small>
              </div>
              <strong>VS</strong>
              <div>
                <span className="avatar ghost">?</span>
                <b>{friendly ? "Your friend" : "Opponent"}</b>
                <small>Not connected</small>
              </div>
            </div>
          </div>
          <Notice>
            {friendly
              ? "Live private rooms are coming soon. Explore the format with a solo rehearsal for now."
              : "Live matchmaking is coming soon. Explore the arena with a solo rehearsal for now."}
          </Notice>
        </section>
        <section className="panel">
          {friendly && (
            <div className="tabbar" role="tablist" aria-label="Room options">
              <button
                role="tab"
                aria-selected={roomTab === "create"}
                className={roomTab === "create" ? "selected" : ""}
                onClick={() => {
                  setRoomTab("create");
                  setRoomMessage("");
                }}
              >
                Create a room
              </button>
              <button
                role="tab"
                aria-selected={roomTab === "join"}
                className={roomTab === "join" ? "selected" : ""}
                onClick={() => {
                  setRoomTab("join");
                  setRoomMessage("");
                }}
              >
                Join with a code
              </button>
            </div>
          )}
          {friendly && roomTab === "join" ? (
            <form
              className="profile-form"
              onSubmit={(e) => {
                e.preventDefault();
                setRoomMessage(
                  /^[A-Z0-9]{6}$/.test(room)
                    ? "Valid code format. Live room lookup is not available yet."
                    : "Enter a 6-character code using letters A–Z and numbers.",
                );
              }}
            >
              <h2>Have an invite?</h2>
              <label>
                Room code
                <input
                  placeholder="ABC123"
                  value={room}
                  maxLength={6}
                  onChange={(e) => setRoom(e.target.value.toUpperCase())}
                  autoComplete="off"
                  required
                />
              </label>
              <button className="btn" type="submit">
                Validate code
              </button>
              {roomMessage && (
                <p className="result" role="status">
                  {roomMessage}
                </p>
              )}
            </form>
          ) : (
            <>
              <h2>Make it your match</h2>
              <div className="profile-form">
                <label>
                  Topic
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  >
                    {[...new Set(problems.map((p) => p.topic))].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Difficulty
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                  >
                    {Object.entries(difficultyNames).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="match-details">
                  <span>
                    Format <b>1 vs 1</b>
                  </span>
                  <span>
                    Practice time <b>15 minutes</b>
                  </span>
                  <span>
                    Rating{" "}
                    <b>
                      {friendly ? "Unchanged" : "Available with live matches"}
                    </b>
                  </span>
                </div>
                {!problem && (
                  <p className="result">
                    No preview problem for this combination. Try another topic
                    or difficulty.
                  </p>
                )}
                <button
                  className="btn"
                  disabled={!problem}
                  onClick={() => {
                    setDeadline(Date.now() + 900000);
                    setRemaining(900);
                    setActive(true);
                  }}
                >
                  Start a rehearsal →
                </button>
                <p className="screen-label">
                  {friendly
                    ? "Rehearsal does not create an online room."
                    : "Rehearsal does not join the matchmaking queue."}
                </p>
              </div>
            </>
          )}
        </section>
      </div>
      <section className="how-it-works">
        <div className="section-head">
          <div>
            <span className="eyebrow">HOW IT WORKS</span>
            <h2>
              {friendly
                ? "A private room. Zero pressure."
                : "From focus to first move."}
            </h2>
          </div>
        </div>
        <div className="step-grid">
          {(friendly
            ? [
                {
                  title: "Create a private room",
                  body: "Pick a topic and difficulty, then share the six-character room code.",
                },
                {
                  title: "Both players ready up",
                  body: "The match begins only when both sides are ready. No third player can join.",
                },
                {
                  title: "Solve side by side",
                  body: "Same problem, same clock. Friendly results never touch your rating.",
                },
              ]
            : [
                {
                  title: "Choose your focus",
                  body: "Filter by topic and difficulty to line up the challenge you want.",
                },
                {
                  title: "Get matched",
                  body: "A rival receives the same problem and the same server-timed clock.",
                },
                {
                  title: "Solve it first",
                  body: "The first correct solution wins. Equal outcomes end in a draw.",
                },
              ]
          ).map((step, i) => (
            <article className="step-card" key={step.title}>
              <span className="step-number">0{i + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
        <div className="rating-note">
          <span className="rating-note-icon">
            <Icon name={friendly ? "friends" : "trophy"} />
          </span>
          <div>
            <strong>
              {friendly
                ? "Friendly battles are always unrated."
                : "Rating stays separate from learning XP."}
            </strong>
            <p>
              {friendly
                ? "Play as often as you like. Nothing here affects your competitive standing."
                : "New-player protection and rating thresholds will be configured before live matches launch."}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
