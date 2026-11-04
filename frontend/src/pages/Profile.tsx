import { useAuth } from "../lib/auth";
import { useState } from "react";
import { useStore } from "../lib/store";

import { Heading, Notice, Icon } from "../components/UI";
import AccountPanel from "../components/AccountPanel";
export default function Profile() {
  const { user } = useAuth();
  const { state, update } = useStore();
  const [name, setName] = useState(state.name);
  const [bio, setBio] = useState(state.bio);
  const [frame, setFrame] = useState(state.frame);
  const [message, setMessage] = useState("");
  const level = user?.level ?? 1;
  const days = Array.from({ length: 56 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (55 - i));
    return d.toISOString().slice(0, 10);
  });
  function save(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = user?.nickname ?? name.trim();
    if (trimmed.length < 2 || trimmed.length > 24) {
      setMessage("Your name must be between 2 and 24 characters.");
      return;
    }
    if (!user && state.renamed && trimmed !== state.name) {
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
  const handle = (user?.nickname ?? "Explorer")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
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
          <span className={`avatar frame-${state.frame}`}>
            {user?.nickname.slice(0, 1).toUpperCase() ?? "E"}
          </span>
          <div className="identity-copy">
            <div className="identity-title">
              <h2>{user?.nickname ?? "Explorer"}</h2>
              <span className="tag profile-level">LVL {level} · BEGINNER</span>
            </div>
            <p>{state.bio}</p>
          </div>
          <div className="identity-xp">
            <span>
              <b>{(user?.xp ?? 0) % 100}</b> / 100 XP to level {level + 1}
            </span>
            <div className="progress">
              <span style={{ width: `${(user?.xp ?? 0) % 100}%` }} />
            </div>
          </div>
        </div>
      </section>
      <AccountPanel />
      <div className="profile-layout">
        <section className="panel">
          <div className="section-head">
            <h2>Your progress</h2>
            <span className="tag">ACCOUNT PROGRESS</span>
          </div>
          <div className="profile-numbers">
            <div>
              <strong>{user?.xp ?? 0}</strong>
              <span>Total XP</span>
            </div>
            <div>
              <strong>{user?.coins ?? 0}</strong>
              <span>Coins</span>
            </div>
            <div>
              <strong>{user?.completedLessons ?? 0}</strong>
              <span>Lessons</span>
            </div>
            <div>
              <strong className="muted-value">—</strong>
              <span>Rating</span>
            </div>
          </div>
          <h3>Local practice activity</h3>
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
            Python rewards and completed lessons are saved to your account. The
            activity grid shows local practice; live battle ratings are pending
            integration.
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
                disabled={!!user}
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
