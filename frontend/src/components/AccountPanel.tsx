import { useState, type FormEvent } from "react";
import { useAuth, authErrorMessage } from "../lib/auth";
import { ApiError } from "../lib/api";
import AvatarFace from "./Avatar";
import { Icon } from "./UI";

type Notice = { tone: "ok" | "error"; text: string };

function profileErrorMessage(caught: unknown) {
  if (
    caught instanceof ApiError &&
    caught.code === "NICKNAME_CHANGE_PAYMENT_REQUIRED"
  ) {
    return "This account already used its free nickname change. Paid changes are not available yet.";
  }
  return authErrorMessage(caught);
}

function NoticeLine({ notice }: { notice: Notice | null }) {
  if (!notice) return null;
  return (
    <div
      className={`result${notice.tone === "error" ? " error" : ""}`}
      role={notice.tone === "error" ? "alert" : "status"}
    >
      {notice.text}
    </div>
  );
}

function SignedOut() {
  const { status, error, login, register, logout, retry } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  if (status === "loading") {
    return (
      <p className="muted" role="status">
        Checking your session…
      </p>
    );
  }

  if (status === "unavailable") {
    return (
      <>
        <div className="result error" role="alert">
          {error ?? "Cannot reach the WorldOfCodes server."}
        </div>
        <div className="account-actions">
          <button className="btn" type="button" onClick={() => void retry()}>
            Retry connection
          </button>
          <button
            className="btn secondary"
            type="button"
            onClick={() => void logout().catch(() => {})}
          >
            Revoke session and sign out
          </button>
        </div>
      </>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      if (mode === "login") {
        await login({ email: email.trim(), password });
      } else {
        await register({
          email: email.trim(),
          password,
          nickname: nickname.trim(),
        });
      }
      setPassword("");
    } catch (caught) {
      setNotice({ tone: "error", text: authErrorMessage(caught) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="account-tabs" role="group" aria-label="Account access">
        <button
          type="button"
          className={`account-tab${mode === "login" ? " active" : ""}`}
          aria-pressed={mode === "login"}
          onClick={() => {
            setMode("login");
            setNotice(null);
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          className={`account-tab${mode === "register" ? " active" : ""}`}
          aria-pressed={mode === "register"}
          onClick={() => {
            setMode("register");
            setNotice(null);
          }}
        >
          Create account
        </button>
      </div>
      <p className="account-note">
        An account keeps your nickname, level, XP and coins on the WorldOfCodes
        server. Python lessons, challenges and typing exercises sync with your
        account. Other language tracks are local practice without account
        rewards.
      </p>
      <form className="account-form" onSubmit={submit}>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            required
            minLength={8}
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {mode === "register" && (
          <label>
            Username
            <input
              required
              minLength={3}
              maxLength={24}
              pattern="[A-Za-z0-9_]+"
              autoComplete="username"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
            />
            <small className="account-hint">
              3–24 Latin letters, digits or underscores.
            </small>
          </label>
        )}
        <div className="account-actions">
          <button className="btn" type="submit" disabled={busy}>
            {busy
              ? mode === "login"
                ? "Signing in…"
                : "Creating account…"
              : mode === "login"
                ? "Sign in"
                : "Create account"}
            {!busy && <Icon name="arrow" />}
          </button>
        </div>
        <NoticeLine notice={notice} />
      </form>
    </>
  );
}

function SignedIn() {
  const { user, logout, updateProfile } = useAuth();
  const [name,setName] = useState(user?.displayName ?? user?.nickname ?? "");
  const [bio,setBio] = useState(user?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  if (!user) return null;

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const next = await updateProfile({
        displayName:name.trim(), bio,
        avatarUrl: avatarUrl.trim() ? avatarUrl.trim() : null,
      });
      setName(next.displayName ?? next.nickname);
      setAvatarUrl(next.avatarUrl ?? "");
      setNotice({ tone: "ok", text: "Your server profile has been updated." });
    } catch (caught) {
      setNotice({ tone: "error", text: profileErrorMessage(caught) });
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      await logout();
    } catch (caught) {
      setNotice({ tone: "error", text: authErrorMessage(caught) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="account-identity">
        <span className="account-avatar">
          <AvatarFace url={user.avatarUrl} name={user.nickname} />
        </span>
        <div>
          <strong>{user.nickname}</strong>
          <span>{user.email}</span>
        </div>
      </div>
      <dl className="account-facts">
        <div>
          <dt>Level</dt>
          <dd>{user.level}</dd>
        </div>
        <div>
          <dt>Server XP</dt>
          <dd>{user.xp}</dd>
        </div>
        <div>
          <dt>Coins</dt>
          <dd>{user.coins}</dd>
        </div>
        {typeof user.completedLessons === "number" && (
          <div>
            <dt>Lessons completed</dt>
            <dd>{user.completedLessons}</dd>
          </div>
        )}
      </dl>
      <p className="account-note">
        Your XP and coins are awarded after the server verifies your work.
        Repeating an exercise lets you practice without earning duplicate
        rewards.
      </p>
      <form className="account-form" onSubmit={save}>
        <label>
          Username<input readOnly value={user.nickname}/></label>
        <label>Display name<input required maxLength={40} value={name} onChange={e=>setName(e.target.value)}/>
        <small>Change once every 14 days.</small></label>
        <label>Bio<textarea maxLength={300} value={bio} onChange={e=>setBio(e.target.value)}/></label>
        <label>Upload avatar<input type="file" accept="image/png,image/jpeg,image/webp" onChange={async e=>{
          const file=e.target.files?.[0]; if(!file)return;
          setBusy(true);
          try {
            if(file.size>8*1024*1024) throw new Error('Choose an image under 8 MB.');
            const bitmap=await createImageBitmap(file);
            const canvas=document.createElement('canvas'); canvas.width=128; canvas.height=128;
            const ctx=canvas.getContext('2d'); if(!ctx)throw new Error('Image processing unavailable');
            const side=Math.min(bitmap.width,bitmap.height);
            ctx.drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,128,128); bitmap.close();
            setAvatarUrl(canvas.toDataURL('image/jpeg',0.65));
          } catch(err){setNotice({tone:'error',text:String(err)})} finally{setBusy(false)}
        }}/>{avatarUrl.startsWith('data:') && <small>Uploaded photo selected</small>}</label>
        <label>
          Avatar URL
          <input
            type="url"
            placeholder="https://example.com/avatar.png"
            maxLength={512}
            value={avatarUrl.startsWith('data:')?'':avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
          />
          <small className="account-hint">
            A public HTTPS image URL, or leave empty to use your initial.
          </small>
        </label>
        <div className="account-actions">
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save server profile"}
          </button>
          <button
            className="btn secondary"
            type="button"
            disabled={busy}
            onClick={() => void signOut()}
          >
            Sign out
          </button>
        </div>
        <NoticeLine notice={notice} />
      </form>
    </>
  );
}

export default function AccountPanel() {
  const { status } = useAuth();
  return (
    <section className="panel account-panel" aria-labelledby="account-title">
      <div className="section-head">
        <h2 id="account-title">Account</h2>
        <span className="tag">
          {status === "authenticated" ? "SERVER SESSION" : "OPTIONAL"}
        </span>
      </div>
      {status === "authenticated" ? <SignedIn /> : <SignedOut />}
    </section>
  );
}
