import { useEffect, useRef, useState } from "react";
import { Provider, useStore } from "./lib/store";
import { Provider as AuthProvider, useAuth } from "./lib/auth";
import AvatarFace from "./components/Avatar";
import { Icon, Heading } from "./components/UI";
import { levelFor } from "./lib/progress.mjs";
import Home from "./pages/Home";
import Learn from "./pages/Learn";
import Algorithms from "./pages/Algorithms";
import Copy from "./pages/Copy";
import Profile from "./pages/Profile";
import Arena from "./pages/Arena";
const routes = [
  { id: "home", name: "Overview", icon: "home" },
  { id: "learn", name: "Lessons", icon: "learn" },
  { id: "algorithms", name: "Challenges", icon: "code" },
  { id: "copy", name: "Typing Lab", icon: "copy" },
  { id: "duel", name: "Duel Arena", icon: "duel" },
  { id: "friends", name: "Friendly Battle", icon: "friends" },
  { id: "profile", name: "My Profile", icon: "profile" },
];
function Shell() {
  const { state, storageError, update } = useStore();
  const { status: authStatus, user } = useAuth();
  const serverAvatar =
    authStatus === "authenticated" ? (user?.avatarUrl ?? null) : null;
  const [route, setRoute] = useState(() => location.hash.slice(1) || "home");
  useEffect(() => {
    if (authStatus !== "authenticated" || !user) return;
    const avatar = user.nickname.slice(0, 1).toUpperCase();
    if (user.nickname !== state.name || avatar !== state.avatar) {
      update({ name: user.nickname, avatar });
    }
  }, [authStatus, user, state.name, state.avatar, update]);
  const [menuOpen, setMenuOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const handler = () => {
      setRoute(location.hash.slice(1) || "home");
      setMenuOpen(false);
      window.scrollTo(0, 0);
      mainRef.current?.focus();
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menuOpen]);
  const [page, id, sub] = route.split("/");
  const current = routes.find((r) => r.id === page);
  useEffect(() => {
    document.title = `${current?.name || "Page not found"} · WorldOfCodes`;
  }, [current]);
  return (
    <>
      <a
        className="skip"
        href="#content"
        onClick={(e) => {
          e.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Skip to content
      </a>
      <aside className={`sidebar${menuOpen ? " mobile-open" : ""}`}>
        <a className="brand" href="#home" aria-label="WorldOfCodes home">
          <span className="brandmark">
            <Icon name="logo" />
          </span>
          <span>
            WorldOf
            <span>
              Codes<span className="brand-period">.</span>
            </span>
          </span>
        </a>
        <div className="mobile-controls">
          <span className="mobile-coins">
            <Icon name="coin" />
            {state.coins}
          </span>
          <button
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls="main-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Icon name={menuOpen ? "close" : "menu"} />
          </button>
        </div>
        <div className="sidebar-interior" id="main-navigation">
          <div className="workspace">
            <span className="workspace-icon">
              <Icon name="planet" />
            </span>
            <div>
              Your workspace<small>A world of possibilities</small>
            </div>
            <span className="workspace-chapter">01</span>
          </div>
          <nav aria-label="Main navigation">
            {routes.map((r, i) => (
              <div key={r.id}>
                {i === 0 || i === 4 || i === 6 ? (
                  <div className="navlabel">
                    {i === 0
                      ? "WORKSPACE"
                      : i === 4
                        ? "PLAY & COMPETE"
                        : "PERSONAL"}
                  </div>
                ) : null}
                <a
                  className={`navitem${page === r.id ? " active" : ""}`}
                  href={`#${r.id}`}
                  aria-current={page === r.id ? "page" : undefined}
                >
                  <Icon name={r.icon} />
                  <span>{r.name}</span>
                  {r.id === "duel" && <span className="badge">1v1</span>}
                  {page === r.id && <span className="nav-active-dot" />}
                </a>
              </div>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="journey">
              <div className="journey-top">
                <span className="mini-bolt">
                  <Icon name="bolt" />
                </span>
                <span>YOUR NEXT LEVEL</span>
                <strong>
                  {String(levelFor(state.xp) + 1).padStart(2, "0")}
                </strong>
              </div>
              <div className="journey-progress">
                <span style={{ width: `${(state.xp % 200) / 2}%` }} />
              </div>
              <p>
                <b>{state.xp % 200}</b> / 200 XP <span>Keep building.</span>
              </p>
            </div>
            <a href="#profile" className="account">
              <span className={`avatar frame-${state.frame}`}>
                <AvatarFace url={serverAvatar} name={state.name} />
              </span>
              <span>
                {state.name}
                <small>Level {levelFor(state.xp)} · Explorer</small>
              </span>
              <Icon name="settings" />
            </a>
          </div>
        </div>
      </aside>
      <div className="shell">
        <header>
          <div className="breadcrumb">
            <Icon name="home" />
            <span>/</span>
            <strong>{current?.name || "404"}</strong>
          </div>
          <div className="header-right">
            <span className="demo">
              <i /> Preview workspace
            </span>
            <span className="balance">
              <Icon name="coin" />
              <b>{state.coins}</b>
              <span>coins</span>
            </span>
            <a
              href="#profile"
              aria-label="Open profile"
              className={`avatar small frame-${state.frame}`}
            >
              <AvatarFace url={serverAvatar} name={state.name} />
            </a>
          </div>
        </header>
        <main ref={mainRef} id="content" tabIndex={-1}>
          {storageError && (
            <div className="result error" role="alert">
              Browser storage is unavailable. Changes may be lost when you close
              this page.
            </div>
          )}
          {page === "home" ? (
            <Home />
          ) : page === "learn" ? (
            <Learn key={route} languageId={id} lessonId={sub} />
          ) : page === "algorithms" ? (
            <Algorithms key={route} id={id} />
          ) : page === "copy" ? (
            <Copy />
          ) : page === "profile" ? (
            <Profile />
          ) : page === "duel" || page === "friends" ? (
            <Arena key={page} friendly={page === "friends"} />
          ) : (
            <>
              <Heading
                title="A little off the path."
                description="That page does not exist. Your next step is waiting at home."
              />
              <a className="btn" href="#home">
                Back to overview <Icon name="arrow" />
              </a>
            </>
          )}
        </main>
        <footer>
          <span>© 2026 WorldOfCodes</span>
          <span>Built, one line at a time.</span>
          <span className="footer-status">
            <i /> Chapter 01
          </span>
        </footer>
      </div>
    </>
  );
}
export default function App() {
  return (
    <AuthProvider>
      <Provider>
        <Shell />
      </Provider>
    </AuthProvider>
  );
}
