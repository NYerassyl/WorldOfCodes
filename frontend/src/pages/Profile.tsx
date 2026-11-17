import { useEffect, useState } from "react";
import { useStore } from "../lib/store";
import { useAuth } from "../lib/auth";
import { levelFor } from "../lib/progress.mjs";
import { Heading, Icon } from "../components/UI";
import PlayerProfile from "../components/PlayerProfile";
import Players from "../components/Players";
import AccountPanel from "../components/AccountPanel";
import AvatarFace from "../components/Avatar";
export default function Profile() {
  const { state, update } = useStore();
  const { status, user } = useAuth();
  const account = status === "authenticated" ? user : null;
  const signedIn = account !== null;
  const [name, setName] = useState(state.name);
  const [bio, setBio] = useState(state.bio);
  const [frame, setFrame] = useState(state.frame);
  const [message, setMessage] = useState("");
  const level = account ? account.level : levelFor(state.xp);
  const xpInLevel = account ? account.xp % 100 : state.xp % 200;
  const xpSpan = account ? 100 : 200;
  useEffect(() => {
    setName(state.name);
  }, [state.name]);
  function save(e: React.FormEvent) {
    e.preventDefault();
    if (signedIn) {
      update({ bio: bio.trim(), frame });
      setMessage("Your device preferences have been saved.");
      return;
    }
    const trimmed = name.trim();
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
  const displayName = account?.displayName ?? account?.nickname ?? state.name;
  const handle = (account?.nickname ?? displayName).trim().toLowerCase().replace(/\s+/g, "_");
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
            <AvatarFace url={account?.avatarUrl ?? null} name={displayName} />
          </span>
          <div className="identity-copy">
            <div className="identity-title">
              <h2>{displayName}</h2>
              <span className="tag profile-level">LVL {level} · BEGINNER</span>
            </div>
            <p>{account ? account.bio : state.bio}</p>
          </div>
          <div className="identity-xp">
            <span>
              <b>{xpInLevel}</b> / {xpSpan} XP to level {level + 1}
            </span>
            <div className="progress">
              <span style={{ width: `${(xpInLevel / xpSpan) * 100}%` }} />
            </div>
          </div>
        </div>
      </section>
      {account && <PlayerProfile key={account.id} id={account.id} me={account.id}/>}
      <AccountPanel />
      {account && <Players key={account.id} me={account.id}/>}
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
        </section>
        <section className="panel">
          <div className="section-head">
            <h2>Make it yours</h2>
            <span className="tag">LOCAL PREVIEW</span>
          </div>
          <form className="profile-form" onSubmit={save}>
            {signedIn ? (
              <p className="muted">
                Edit your public profile in the
                Account panel above.
              </p>
            ) : (
              <>
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
              </>
            )}
            {!signedIn && <label>
              About you
              <input
                maxLength={100}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </label>}
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
