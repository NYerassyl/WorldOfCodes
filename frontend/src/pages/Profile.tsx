import { useEffect, useState } from "react";
import * as api from "../lib/api";
import { ApiError } from "../lib/api";
import type {
  ActivityDay,
  ActivityResponse,
  CommunityList,
  PublicProfile,
} from "../lib/api";
import { useStore } from "../lib/store";
import { useAuth, authErrorMessage } from "../lib/auth";
import { levelFor } from "../lib/progress.mjs";
import { Heading, Notice, Icon } from "../components/UI";
import AccountPanel from "../components/AccountPanel";
import AvatarFace from "../components/Avatar";

function formatDay(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatMonth(month: string) {
  const date = new Date(`${month}-01T00:00:00Z`);
  return `${date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })} ${String(date.getUTCFullYear()).slice(2)}`;
}

function formatJoined(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

const titleCase = (slug: string) =>
  slug
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const count = (value: number) => value.toLocaleString("en-US");

function heatLevel(day: ActivityDay) {
  const total = day.submissions + day.solved;
  if (total === 0) return "";
  if (total <= 1) return "l1";
  if (total <= 3) return "l2";
  if (total <= 6) return "l3";
  return "l4";
}

function heatWeeks(days: ActivityDay[]) {
  if (!days.length) return [];
  const weeks: (ActivityDay | null)[][] = [];
  let week: (ActivityDay | null)[] = Array.from(
    { length: days[0].weekday },
    () => null,
  );
  for (const day of days) {
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

function deltaLabel(value: number) {
  if (value === 0) return "same as previous 30 days";
  return `${value > 0 ? "+" : ""}${value} vs previous 30 days`;
}

function ActivityPanel({ activity }: { activity: ActivityResponse }) {
  const weeks = heatWeeks(activity.days);
  const maxTopic = Math.max(1, ...activity.topics.map((row) => row.submissions));
  const maxDifficulty = Math.max(
    1,
    ...activity.difficulties.map((row) => row.submissions),
  );
  const { totals, windows } = activity;
  return (
    <>
      <section className="panel profile-analytics" aria-labelledby="analytics-title">
        <div className="section-head">
          <h2 id="analytics-title">Practice analytics</h2>
          <span className="tag">LAST 12 MONTHS</span>
        </div>
        <div className="profile-numbers analytics-totals">
          <div>
            <strong>{count(totals.submissions)}</strong>
            <span>Submissions</span>
          </div>
          <div>
            <strong>{count(totals.solved)}</strong>
            <span>Problems solved</span>
          </div>
          <div>
            <strong>{totals.maxStreak}</strong>
            <span>Longest streak · days</span>
          </div>
          <div>
            <strong>{totals.currentStreak}</strong>
            <span>Current streak · days</span>
          </div>
        </div>
        <p className="muted analytics-note">
          All time: {count(activity.allTime.submissions)} submissions ·{" "}
          {count(activity.allTime.solved)} problems solved · {totals.activeDays}{" "}
          active {totals.activeDays === 1 ? "day" : "days"} this year
        </p>
        <h3>Submission heatmap</h3>
        <div className="heatmap-scroll">
          <div
            className="heatmap-year"
            role="img"
            aria-label={`Submissions per day from ${formatDay(activity.from)} to ${formatDay(activity.to)}`}
          >
            {weeks.map((week, weekIndex) =>
              week.map((day, dayIndex) =>
                day ? (
                  <span
                    key={day.date}
                    className={`heat-cell ${heatLevel(day)}`}
                    title={`${formatDay(day.date)} · ${day.submissions} ${
                      day.submissions === 1 ? "submission" : "submissions"
                    } · ${day.solved} solved`}
                  />
                ) : (
                  <span
                    key={`empty-${weekIndex}-${dayIndex}`}
                    className="heat-cell empty"
                    aria-hidden="true"
                  />
                ),
              ),
            )}
          </div>
        </div>
        <div className="heatmap-legend" aria-hidden="true">
          <span>Less</span>
          <i className="heat-cell" />
          <i className="heat-cell l1" />
          <i className="heat-cell l2" />
          <i className="heat-cell l3" />
          <i className="heat-cell l4" />
          <span>More</span>
        </div>
        <div className="month-grid" aria-label="Monthly breakdown">
          {activity.months.map((month) => (
            <div className="month-card" key={month.month}>
              <strong>{formatMonth(month.month)}</strong>
              <span>
                {month.submissions} sub · {month.solved} solved
              </span>
            </div>
          ))}
        </div>
      </section>
      <section className="panel" aria-labelledby="momentum-title">
        <div className="section-head">
          <h2 id="momentum-title">Momentum</h2>
          <span className="tag">30-DAY COMPARISON</span>
        </div>
        <div className="compare-grid">
          <div className="compare-card">
            <strong>{count(windows.last30.submissions)}</strong>
            <span>Submissions · last 30 days</span>
            <small
              className={
                windows.last30.submissions - windows.previous30.submissions >= 0
                  ? "up"
                  : "down"
              }
            >
              {deltaLabel(
                windows.last30.submissions - windows.previous30.submissions,
              )}
            </small>
          </div>
          <div className="compare-card">
            <strong>{count(windows.last30.solved)}</strong>
            <span>Solved · last 30 days</span>
            <small
              className={
                windows.last30.solved - windows.previous30.solved >= 0
                  ? "up"
                  : "down"
              }
            >
              {deltaLabel(windows.last30.solved - windows.previous30.solved)}
            </small>
          </div>
          <div className="compare-card">
            <strong>{count(totals.solved)}</strong>
            <span>Solved · last 12 months</span>
            <small>{count(totals.accepted)} accepted submissions</small>
          </div>
        </div>
        <div className="breakdown-grid">
          <div>
            <h3>Topics</h3>
            {activity.topics.length === 0 ? (
              <p className="muted">No submissions in the last year yet.</p>
            ) : (
              <ul className="breakdown-list">
                {activity.topics.map((row) => (
                  <li key={row.topic}>
                    <span className="breakdown-label">
                      {titleCase(row.topic)}
                    </span>
                    <span className="breakdown-track">
                      <span
                        style={{
                          width:
                            row.submissions === 0
                              ? "0"
                              : `${Math.max(4, (row.submissions / maxTopic) * 100)}%`,
                        }}
                      />
                    </span>
                    <span className="breakdown-value">
                      {row.submissions} / {row.solved}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="muted breakdown-note">Submissions / solved</p>
          </div>
          <div>
            <h3>Difficulty</h3>
            <ul className="breakdown-list">
              {activity.difficulties.map((row) => (
                <li key={row.difficulty}>
                  <span className={`breakdown-label difficulty-${row.difficulty.toLowerCase()}`}>
                    {titleCase(row.difficulty)}
                  </span>
                  <span className="breakdown-track">
                    <span
                      className={`difficulty-${row.difficulty.toLowerCase()}`}
                      style={{
                        width:
                          row.submissions === 0
                            ? "0"
                            : `${Math.max(4, (row.submissions / maxDifficulty) * 100)}%`,
                      }}
                    />
                  </span>
                  <span className="breakdown-value">
                    {row.submissions} / {row.solved}
                  </span>
                </li>
              ))}
            </ul>
            <p className="muted breakdown-note">Submissions / solved</p>
          </div>
        </div>
      </section>
    </>
  );
}

export default function Profile({ handle }: { handle?: string }) {
  const { state, update } = useStore();
  const { status, user } = useAuth();
  const account = status === "authenticated" ? user : null;
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [activity, setActivity] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(handle));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [listTab, setListTab] = useState<"followers" | "following" | null>(
    null,
  );
  const [list, setList] = useState<CommunityList | null>(null);
  const [listBusy, setListBusy] = useState(false);
  const [bio, setBio] = useState(state.bio);
  const [frame, setFrame] = useState(state.frame);
  const [saved, setSaved] = useState("");
  const target = handle ?? account?.username ?? null;

  useEffect(() => {
    setBio(state.bio);
    setFrame(state.frame);
  }, [state.bio, state.frame]);

  useEffect(() => {
    setListTab(null);
    setList(null);
    setNotice(null);
  }, [target]);

  useEffect(() => {
    if (!target) {
      setProfile(null);
      setActivity(null);
      setLoadError(null);
      setNotFound(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setNotFound(false);
    Promise.all([api.getPublicProfile(target), api.getProfileActivity(target)])
      .then(([nextProfile, nextActivity]) => {
        if (cancelled) return;
        setProfile(nextProfile);
        setActivity(nextActivity);
      })
      .catch((caught) => {
        if (cancelled) return;
        setProfile(null);
        setActivity(null);
        if (caught instanceof ApiError && caught.status === 404) setNotFound(true);
        else setLoadError(authErrorMessage(caught));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [target, refreshKey]);

  async function loadList(tab: "followers" | "following") {
    if (!profile) return;
    setListTab(tab);
    setListBusy(true);
    setNotice(null);
    try {
      setList(
        tab === "followers"
          ? await api.getFollowers(profile.username)
          : await api.getFollowing(profile.username),
      );
    } catch (caught) {
      setNotice(authErrorMessage(caught));
    } finally {
      setListBusy(false);
    }
  }

  async function toggleList(tab: "followers" | "following") {
    if (listTab === tab) {
      setListTab(null);
      setList(null);
      return;
    }
    await loadList(tab);
  }

  async function toggleFollow() {
    if (!profile || followBusy) return;
    if (status !== "authenticated") {
      setNotice("Sign in with your account to follow other developers.");
      return;
    }
    setFollowBusy(true);
    setNotice(null);
    try {
      const result = profile.isFollowing
        ? await api.unfollowUser(profile.username)
        : await api.followUser(profile.username);
      setProfile({
        ...profile,
        isFollowing: result.following,
        followers: result.followersCount,
      });
      if (listTab === "followers") await loadList("followers");
    } catch (caught) {
      setNotice(authErrorMessage(caught));
    } finally {
      setFollowBusy(false);
    }
  }

  function saveAppearance(event: React.FormEvent) {
    event.preventDefault();
    update({ bio: bio.trim(), frame });
    setSaved("Your device preferences have been saved.");
  }

  if (handle && loading) {
    return (
      <>
        <Heading
          title="Loading profile"
          description="Bringing together practice history and progress."
        />
        <p className="muted" role="status">
          Loading profile…
        </p>
      </>
    );
  }

  if (handle && notFound) {
    return (
      <>
        <Heading
          title="Profile not found"
          description="This username does not exist. Check the handle or open your own profile."
        />
        <a className="btn" href="#home">
          Back to overview <Icon name="arrow" />
        </a>
      </>
    );
  }

  if (handle && loadError) {
    return (
      <>
        <Heading
          title="Profile unavailable"
          description="The server could not load this profile right now."
        />
        <div className="result error" role="alert">
          {loadError}
        </div>
        <button
          className="btn"
          type="button"
          onClick={() => setRefreshKey((key) => key + 1)}
        >
          Try again
        </button>
      </>
    );
  }

  const isOwn = !handle || profile?.isMe === true;
  const displayName = profile?.nickname ?? account?.nickname ?? state.name;
  const avatarUrl = profile?.avatarUrl ?? account?.avatarUrl ?? null;
  const username = profile?.username ?? account?.username ?? null;
  const level = profile?.level ?? account?.level ?? levelFor(state.xp);
  const xp = profile?.xp ?? account?.xp ?? state.xp;
  const xpInLevel = xp % 100;
  const rating = profile?.rating ?? null;

  return (
    <>
      <Heading
        title={isOwn ? "Your developer identity" : `${displayName}'s profile`}
        description={
          isOwn
            ? "Every lesson, every challenge, every step forward."
            : "Public practice history, streaks and progress."
        }
      >
        {isOwn ? (
          <a className="btn secondary" href="#learn">
            Continue learning <Icon name="arrow" />
          </a>
        ) : (
          <a className="btn secondary" href="#algorithms">
            Browse challenges <Icon name="arrow" />
          </a>
        )}
      </Heading>
      <section className="profile-hero" aria-label="Profile overview">
        <div className="profile-cover">
          <div className="cover-badges">
            <span>{isOwn ? "YOUR PROFILE" : "PUBLIC PROFILE"}</span>
            <span>
              {profile
                ? `JOINED ${formatJoined(profile.joinedAt).toUpperCase()}`
                : "LOCAL DEVICE"}
            </span>
          </div>
          <span className="cover-handle">
            {username ? `@${username}` : "<local />"}
          </span>
          <span className="cover-glow" aria-hidden="true" />
        </div>
        <div className="profile-identity">
          <span className={`avatar frame-${state.frame}`}>
            <AvatarFace url={avatarUrl} name={displayName} />
          </span>
          <div className="identity-copy">
            <div className="identity-title">
              <h2>{displayName}</h2>
              <span className="tag profile-level">LVL {level}</span>
              {rating && (
                <span className="tag profile-level">{rating.points} RATED</span>
              )}
            </div>
            <p>
              {isOwn
                ? state.bio ||
                  "Add an introduction in your device preferences below."
                : profile
                  ? `Member since ${formatJoined(profile.joinedAt)}`
                  : ""}
            </p>
          </div>
          <div className="identity-actions">
            {profile && !profile.isMe && (
              <>
                {status === "authenticated" ? (
                  <>
                    <button
                      type="button"
                      className={`btn ${profile.isFollowing ? "secondary" : ""}`}
                      disabled={followBusy}
                      aria-pressed={profile.isFollowing}
                      onClick={() => void toggleFollow()}
                    >
                      {followBusy
                        ? "Saving…"
                        : profile.isFollowing
                          ? "Following"
                          : "Follow"}
                    </button>
                    <a className="btn secondary" href={`#chat/${profile.id}`}>
                      Message
                    </a>
                  </>
                ) : (
                  <a className="btn" href="#profile">
                    Sign in to follow
                  </a>
                )}
              </>
            )}
            {profile?.isMe && (
              <a className="btn secondary" href="#profile">
                Account settings
              </a>
            )}
          </div>
          <div className="identity-xp">
            <span>
              <b>{xpInLevel}</b> / 100 XP to level {level + 1}
            </span>
            <div className="progress">
              <span style={{ width: `${xpInLevel}%` }} />
            </div>
          </div>
        </div>
      </section>
      {notice && (
        <p className="result" role="status">
          {notice}
        </p>
      )}
      {profile && (
        <>
          <div className="profile-stats" aria-label="Profile statistics">
            <button
              type="button"
              className={listTab === "followers" ? "active" : ""}
              aria-pressed={listTab === "followers"}
              onClick={() => void toggleList("followers")}
            >
              <strong>{count(profile.followers)}</strong>
              <span>Followers</span>
            </button>
            <button
              type="button"
              className={listTab === "following" ? "active" : ""}
              aria-pressed={listTab === "following"}
              onClick={() => void toggleList("following")}
            >
              <strong>{count(profile.following)}</strong>
              <span>Following</span>
            </button>
            <div>
              <strong>{count(profile.solvedProblems)}</strong>
              <span>Problems solved</span>
            </div>
            <div>
              <strong>{count(profile.submissions)}</strong>
              <span>Submissions</span>
            </div>
            <div>
              <strong>{count(profile.completedLessons)}</strong>
              <span>Lessons done</span>
            </div>
            <div>
              <strong>{rating ? count(rating.points) : "—"}</strong>
              <span>Ranked rating</span>
            </div>
          </div>
          {listTab && (
            <section className="panel community-panel" aria-live="polite">
              <div className="section-head">
                <h2>
                  {listTab === "followers" ? "Followers" : "Following"}
                </h2>
                <span className="tag">
                  {list ? `${count(list.total)} TOTAL` : "LOADING"}
                </span>
              </div>
              {listBusy ? (
                <p className="muted" role="status">
                  Loading people…
                </p>
              ) : list && list.items.length > 0 ? (
                <ul className="community-list">
                  {list.items.map((entry) => (
                    <li key={entry.id}>
                      <a href={`#profile/${entry.username}`}>
                        <span className="avatar small">
                          <AvatarFace url={entry.avatarUrl} name={entry.nickname} />
                        </span>
                        <span>
                          <strong>{entry.nickname}</strong>
                          <small>
                            @{entry.username} · Level {entry.level}
                          </small>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">
                  {listTab === "followers"
                    ? "No followers yet."
                    : "Not following anyone yet."}
                </p>
              )}
            </section>
          )}
        </>
      )}
      {isOwn && <AccountPanel />}
      {isOwn && !account && (
        <Notice>
          Create an account to get your unique @username, followers, public
          profile and yearly practice analytics.
        </Notice>
      )}
      {activity && <ActivityPanel activity={activity} />}
      {isOwn && (
        <section className="panel">
          <div className="section-head">
            <h2>Device preferences</h2>
            <span className="tag">THIS BROWSER ONLY</span>
          </div>
          <form className="profile-form" onSubmit={saveAppearance}>
            <label>
              About you
              <input
                maxLength={100}
                value={bio}
                onChange={(event) => setBio(event.target.value)}
              />
            </label>
            <fieldset className="frame-picker">
              <legend>Avatar frame · free collection</legend>
              {[
                { id: "sage", name: "Sage" },
                { id: "sand", name: "Sand" },
                { id: "slate", name: "Slate" },
              ].map((choice) => (
                <label
                  className={`frame-choice frame-${choice.id}`}
                  key={choice.id}
                >
                  <input
                    type="radio"
                    name="frame"
                    value={choice.id}
                    checked={frame === choice.id}
                    onChange={() => setFrame(choice.id)}
                  />
                  {choice.name}
                </label>
              ))}
            </fieldset>
            <button className="btn" type="submit">
              Save preferences
            </button>
            {saved && (
              <p className="result" role="status">
                {saved}
              </p>
            )}
          </form>
        </section>
      )}
    </>
  );
}
