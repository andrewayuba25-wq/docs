import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSession, useDbVersion } from '../../lib/store';
import { mutations, queries } from '../../lib/db';
import { TopBar } from '../../components/UI';

export function Chat() {
  useDbVersion();
  const { bookingId } = useParams();
  const { user } = useSession();
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const booking = bookingId ? queries.bookingById(bookingId) : undefined;
  const messages = bookingId ? queries.messagesForBooking(bookingId) : [];
  const otherId = booking
    ? (user?.id === booking.customerId ? booking.artisanId : booking.customerId)
    : undefined;
  const other = otherId ? queries.userById(otherId) ?? queries.artisanById(otherId) : undefined;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function send() {
    if (!draft.trim() || !bookingId || !user) return;
    mutations.sendMessage(bookingId, user.id, draft.trim());
    setDraft('');
    // Simulate the other party auto-replying once, for a lively demo.
    if (messages.filter((m) => m.senderId !== 'system' && m.senderId !== user.id).length === 0 && otherId) {
      setTimeout(() => {
        mutations.sendMessage(bookingId, otherId, 'Thanks for reaching out! I can be there shortly. 👍');
      }, 900);
    }
  }

  if (!booking) return (<><TopBar title="Chat" back /><div className="empty">Conversation not found.</div></>);

  return (
    <div className="chat-wrap">
      <TopBar
        title={(other as { fullName?: string })?.fullName ?? 'Chat'}
        back
        right={<a href={`tel:${(other as { phone?: string })?.phone ?? ''}`} className="icon-btn">📞</a>}
      />
      <div className="chat-msgs">
        {messages.map((m) => {
          if (m.senderId === 'system') return <div key={m.id} className="bubble sys">{m.body}</div>;
          const mine = m.senderId === user?.id;
          return (
            <div key={m.id} className={`bubble ${mine ? 'me' : 'them'}`}>
              {m.body}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="chat-input">
        <input
          className="input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Type a message…"
        />
        <button className="send-btn" onClick={send} aria-label="Send">➤</button>
      </div>
    </div>
  );
}
