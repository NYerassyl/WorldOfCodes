import { useEffect, useRef, useState } from "react";
import * as api from "../lib/api";
import type { ChatPeer, Conversation, DirectMessage } from "../lib/api";
import { useAuth, authErrorMessage } from "../lib/auth";
import AvatarFace from "../components/Avatar";
import { Heading, Notice, Icon } from "../components/UI";

function formatMoment(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function preview(message: DirectMessage, me: string) {
  const body = message.body.length > 72 ? `${message.body.slice(0, 72)}…` : message.body;
  return message.senderId === me ? `You: ${body}` : body;
}

function PeerLine({ peer }: { peer: ChatPeer }) {
  return (
    <>
      <span className="avatar small">
        <AvatarFace url={peer.avatarUrl} name={peer.nickname} />
      </span>
      <span className="chat-peer-copy">
        <strong>{peer.displayName || peer.nickname}</strong>
        <small>@{peer.nickname}</small>
      </span>
    </>
  );
}

function Conversations({ me }: { me: string }) {
  const [items, setItems] = useState<Conversation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const abort = new AbortController();
    const load = async () => {
      try {
        const list = await api.getConversations();
        if (!abort.signal.aborted) {
          setItems(list.items);
          setError(null);
        }
      } catch (caught) {
        if (!abort.signal.aborted) setError(authErrorMessage(caught));
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    };
    void load();
    const timer = setInterval(load, 5000);
    return () => {
      abort.abort();
      clearInterval(timer);
    };
  }, []);

  const unread = items.reduce((sum, item) => sum + item.unread, 0);

  return (
    <>
      <Heading
        title="Messages"
        description="One conversation per developer. History stays on the server, so signing back in brings it back."
      >
        <span className="tag">{unread > 0 ? `${unread} UNREAD` : "ALL CAUGHT UP"}</span>
      </Heading>
      {error && <Notice>{error}</Notice>}
      <section className="panel chat-panel" aria-live="polite">
        <div className="section-head">
          <h2>Conversations</h2>
          <a className="btn secondary" href="#players">
            Find players
          </a>
        </div>
        {loading && <p className="chat-empty">Loading conversations…</p>}
        {!loading && items.length === 0 && (
          <p className="chat-empty">
            No conversations yet. Find a player or open a profile and press{" "}
            <strong>Message</strong> to start one.
          </p>
        )}
        <div className="conversation-list">
          {items.map((item) => (
            <a
              key={item.peer.id}
              className="conversation-row"
              href={`#chat/${item.peer.id}`}
            >
              <PeerLine peer={item.peer} />
              <span className="conversation-meta">
                <small>{formatMoment(item.lastMessage.createdAt)}</small>
                {item.unread > 0 && (
                  <span className="unread-badge" aria-label={`${item.unread} unread`}>
                    {item.unread}
                  </span>
                )}
              </span>
              <span className="conversation-preview">
                {preview(item.lastMessage, me)}
              </span>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}

function Thread({ me, peerId }: { me: string; peerId: string }) {
  const [peer, setPeer] = useState<ChatPeer | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const abort = new AbortController();
    const load = async () => {
      try {
        const thread = await api.getChatThread(peerId);
        if (abort.signal.aborted) return;
        setPeer(thread.peer);
        setMessages(thread.messages);
        setError(null);
        if (thread.messages.some((message) => message.recipientId === me && !message.readAt)) {
          await api.markChatRead(peerId);
          if (!abort.signal.aborted) {
            setMessages((current) =>
              current.map((message) =>
                message.recipientId === me
                  ? { ...message, readAt: message.readAt ?? new Date().toISOString() }
                  : message,
              ),
            );
          }
        }
      } catch (caught) {
        if (!abort.signal.aborted) setError(authErrorMessage(caught));
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    };
    void load();
    const timer = setInterval(load, 4000);
    return () => {
      abort.abort();
      clearInterval(timer);
    };
  }, [peerId, me]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const result = await api.sendChatMessage(peerId, body);
      setMessages((current) => [...current, result.message]);
      setDraft("");
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <p className="chat-back">
        <a href="#chat">
          <Icon name="arrow" /> All conversations
        </a>
      </p>
      {error && <Notice>{error}</Notice>}
      <section className="panel chat-panel">
        <div className="section-head chat-thread-head">
          {peer ? (
            <a href={`#profile/${peer.id}`} className="chat-peer">
              <PeerLine peer={peer} />
            </a>
          ) : (
            <span className="chat-peer">
              <span className="chat-peer-copy">
                <strong>Conversation</strong>
              </span>
            </span>
          )}
          <span className="tag">PRIVATE</span>
        </div>
        <div className="chat-bubbles" aria-live="polite">
          {loading && <p className="chat-empty">Loading history…</p>}
          {!loading && messages.length === 0 && (
            <p className="chat-empty">
              No messages yet. Say hello to start this history.
            </p>
          )}
          {messages.map((message) => {
            const mine = message.senderId === me;
            return (
              <div key={message.id} className={`bubble${mine ? " mine" : ""}`}>
                <p>{message.body}</p>
                <small>
                  {formatMoment(message.createdAt)}
                  {mine && message.readAt ? " · Read" : ""}
                </small>
              </div>
            );
          })}
          <div ref={bottom} />
        </div>
        <form className="chat-composer" onSubmit={submit}>
          <label className="chat-composer-label">
            Message
            <input
              value={draft}
              maxLength={1000}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write a message…"
            />
          </label>
          <button className="btn" disabled={sending || !draft.trim()}>
            {sending ? "Sending…" : "Send"}
          </button>
        </form>
      </section>
    </>
  );
}

export default function Chat({ peerId }: { peerId?: string }) {
  const { status, user } = useAuth();
  if (status !== "authenticated" || !user) {
    return (
      <>
        <Heading
          title="Messages"
          description="Sign in to open your conversations. Histories are stored per person on the server."
        />
        <a className="btn" href="#profile">
          Sign in to open chat <Icon name="arrow" />
        </a>
      </>
    );
  }
  return peerId && peerId !== user.id ? (
    <Thread key={peerId} me={user.id} peerId={peerId} />
  ) : (
    <Conversations key="list" me={user.id} />
  );
}
