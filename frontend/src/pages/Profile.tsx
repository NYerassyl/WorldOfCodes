import { useState } from "react";
import { useStore } from "../lib/store";
import { levelFor } from "../lib/progress.mjs";
import { Heading, Notice, Icon } from "../components/UI";
import AccountPanel from "../components/AccountPanel";
export default function Profile() {
  const { state, update } = useStore();
  const [name, setName] = useState(state.name);
  const [bio, setBio] = useState(state.bio);
  const [frame, setFrame] = useState(state.frame);
  const [message, setMessage] = useState("");
  const level = levelFor(state.xp);
  const days = Array.from({ length: 56 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (55 - i));
    return d.toISOString().slice(0, 10);
  });
  function save(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 24) {
      setMessage("Your name must be between 2 and 24 characters.");
      return;
    }
    if (state.renamed && trimmed !== state.name) {
      setMessage(
        "Your free name change has been used. Paid changes are not available yet.",
      );
      return;
    }
    update({
      name: trimmed,
      bio: bio.trim(),
      frame,
      avatar: trimmed.slice(0, 1).toUpperCase(),
      renamed: state.renamed || trimmed !== state.name,
    });
    setMessage("Your profile has been saved in this browser.");
  }
  const handle = state.name.trim().toLowerCase().replace(/\s+/g, "_");
  const activeDays = Object.keys(state.activity).filter((d) =>
    days.includes(d),
  ).length;
  return (
    <>
      <Heading
        title="Your developer identity"
        description="Every lesson, every challenge, every step forward."
      >
        <a className="btn secondary" href="#learn">
          Continue learning <Icon name="arrow" />
        </a>
      </Heading>
      <section className="profile-hero" aria-label="Profile overview">
        <div className="profile-cover">
          <div className="cover-badges">
            <span>CHAPTER 01</span>
            <span>BUILDING IN PUBLIC</span>
          </div>
          <span className="cover-handle">&lt;{handle} /&gt;</span>
          <span className="cover-glow" aria-hidden="true" />
        </div>
        <div className="profile-identity">
          <span className={`avatar frame-${state.frame}`}>{state.avatar}</span>
          <div className="identity-copy">
            <div className="identity-title">
              <h2>{state.name}</h2>
              <span className="tag profile-level">LVL {level} · BEGINNER</span>
            </div>
            <p>{state.bio}</p>
          </div>
          <div className="identity-xp">
            <span>
              <b>{state.xp % 200}</b> / 200 XP to level {level + 1}
            </span>
            <div className="progress">
              <span style={{ width: `${(state.xp % 200) / 2}%` }} />
            </div>
          </div>
        </div>
      </section>
      <AccountPanel />
      <div className="profile-layout">
        <section className="panel">
          <div className="section-head">
            <h2>Your progress</h2>
            <span className="tag">PREVIEW DATA</span>
          </div>
          <div className="profile-numbers">
            <div>
              <strong>{state.xp}</strong>
              <span>Total XP</span>
            </div>
            <div>
              <strong>{state.coins}</strong>
              <span>Coins</span>
            </div>
            <div>
              <strong>{state.completed.length}</strong>
              <span>Exercises</span>
            </div>
            <div>
              <strong className="muted-value">—</strong>
              <span>Rating</span>
            </div>
          </div>
          <h3>Learning activity</h3>
          <div
            className="heatmap"
            aria-label="Learning activity over the last 56 days"
          >
            {days.map((day) => (
              <span
                key={day}
                className={state.activity[day] ? "on" : ""}
                title={`${day}: ${state.activity[day] || 0} exercises`}
              />
            ))}
          </div>
          <p className="muted">
            Last 56 days · {activeDays} active{" "}
            {activeDays === 1 ? "day" : "days"}
          </p>
          <Notice>
            Your rating will appear after your first live match. This preview
            saves your progress on this device.
          </Notice>
        </section>
        <section className="panel">
          <div className="section-head">
            <h2>Make it yours</h2>
            <span className="tag">LOCAL PREVIEW</span>
          </div>
          <form className="profile-form" onSubmit={save}>
            <label>
              Display name
              <input
                required
                minLength={2}
                maxLength={24}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <small className="muted">
              {state.renamed
                ? "Your free name change has been used."
                : "Your first name change is free."}
            </small>
            <label>
              About you
              <input
                maxLength={100}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </label>
            <fieldset className="frame-picker">
              <legend>Avatar frame · free collection</legend>
              {[
                { id: "sage", name: "Sage" },
                { id: "sand", name: "Sand" },
                { id: "slate", name: "Slate" },
              ].map((f) => (
                <label className={`frame-choice frame-${f.id}`} key={f.id}>
                  <input
                    type="radio"
                    name="frame"
                    value={f.id}
                    checked={frame === f.id}
                    onChange={() => setFrame(f.id)}
                  />
                  {f.name}
                </label>
              ))}
            </fieldset>
            <button className="btn" type="submit">
              Save changes
            </button>
            {message && (
              <p className="result" role="status">
                {message}
              </p>
            )}
          </form>
        </section>
      </div>
    </>
  );
}
