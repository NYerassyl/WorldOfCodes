import { useEffect, useState } from "react";
import * as api from "../lib/api";
import type { Notification } from "../lib/api";
import { useAuth, authErrorMessage } from "../lib/auth";
import { Heading, Notice, Icon } from "../components/UI";

function formatMoment(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function notificationLink(item: Notification) {
  return item.type === "FOLLOW"
    ? `#profile/${item.actor.id}`
    : `#chat/${item.actor.id}`;
}

function notificationText(item: Notification) {
  const name = item.actor.displayName || item.actor.nickname;
  return item.type === "FOLLOW"
    ? `${name} followed you.`
    : `${name} sent you a message.`;
}

export function NotificationsBell() {
  const { status, user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (status !== "authenticated" || !user) {
      setUnread(0);
      return;
    }
    let active = true;
    const load = async () => {
      try {
        const result = await api.getUnreadNotificationCount();
        if (active) setUnread(result.unreadCount);
      } catch {
        if (active) setUnread(0);
      }
    };
    void load();
    const timer = setInterval(load, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [status, user]);

  return (
    <a className="notification-bell" href="#notifications" aria-label={
      unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
    }>
      <Icon name="bolt" />
      <span>Alerts</span>
      {unread > 0 && <span className="unread-badge">{unread > 99 ? "99+" : unread}</span>}
    </a>
  );
}

export default function Notifications() {
  const { status, user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated" || !user) {
      setLoading(false);
      return;
    }
    const abort = new AbortController();
    api
      .getNotifications()
      .then((list) => {
        if (abort.signal.aborted) return;
        setItems(list.items);
        setUnreadCount(list.unreadCount);
        setNextCursor(list.nextCursor);
        setError(null);
      })
      .catch((caught) => {
        if (!abort.signal.aborted) setError(authErrorMessage(caught));
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [status, user]);

  async function loadMore() {
    if (!nextCursor) return;
    try {
      const list = await api.getNotifications(nextCursor);
      setItems((current) => [...current, ...list.items]);
      setUnreadCount(list.unreadCount);
      setNextCursor(list.nextCursor);
    } catch (caught) {
      setError(authErrorMessage(caught));
    }
  }

  function markRead(item: Notification) {
    if (item.readAt) return;
    setItems((current) =>
      current.map((entry) =>
        entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry,
      ),
    );
    setUnreadCount((count) => Math.max(0, count - 1));
    void api.markNotificationsRead({ ids: [item.id] }).catch((caught) => {
      setError(authErrorMessage(caught));
    });
  }

  async function markAll() {
    try {
      const result = await api.markNotificationsRead({ all: true });
      const stamp = new Date().toISOString();
      setItems((current) =>
        current.map((item) => (item.readAt ? item : { ...item, readAt: stamp })),
      );
      setUnreadCount(result.unreadCount);
    } catch (caught) {
      setError(authErrorMessage(caught));
    }
  }

  if (status !== "authenticated" || !user) {
    return (
      <>
        <Heading
          title="Notifications"
          description="Sign in to see follows and messages waiting for you."
        />
        <a className="btn" href="#profile">
          Sign in to continue <Icon name="arrow" />
        </a>
      </>
    );
  }

  return (
    <>
      <Heading
        title="Notifications"
        description="Follows and new messages. Opening an alert marks it as read."
      >
        <span className="tag">{unreadCount > 0 ? `${unreadCount} UNREAD` : "ALL CAUGHT UP"}</span>
      </Heading>
      {error && <Notice>{error}</Notice>}
      <section className="panel notification-panel" aria-live="polite">
        <div className="section-head">
          <h2>Inbox</h2>
          <button
            type="button"
            className="btn secondary"
            disabled={unreadCount === 0}
            onClick={() => void markAll()}
          >
            Mark all read
          </button>
        </div>
        {loading && <p className="chat-empty">Loading notifications…</p>}
        {!loading && items.length === 0 && (
          <p className="chat-empty">
            Nothing here yet. Follows and messages will appear in this inbox.
          </p>
        )}
        <div className="notification-list">
          {items.map((item) => (
            <a
              key={item.id}
              className={`notification-row${item.readAt ? "" : " unread"}`}
              href={notificationLink(item)}
              onClick={() => markRead(item)}
            >
              <span className="notification-dot" aria-hidden="true" />
              <span className="notification-copy">
                <strong>{notificationText(item)}</strong>
                <small>{formatMoment(item.createdAt)}</small>
              </span>
              <span className="tag">{item.type}</span>
            </a>
          ))}
        </div>
        {nextCursor && (
          <button type="button" className="btn secondary" onClick={() => void loadMore()}>
            Load older
          </button>
        )}
      </section>
    </>
  );
}
