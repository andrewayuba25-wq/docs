import { useNavigate, useParams } from 'react-router-dom';
import { useDbVersion } from '../../lib/store';
import { mutations, queries } from '../../lib/db';
import type { BookingStatus } from '../../lib/types';
import { Avatar, Card, StatusBadge, TopBar } from '../../components/UI';

export function JobDetail() {
  useDbVersion();
  const { id } = useParams();
  const nav = useNavigate();
  const b = id ? queries.bookingById(id) : undefined;

  if (!b) return (<><TopBar title="Job" back /><div className="empty">Job not found.</div></>);

  const customer = queries.userById(b.customerId);

  function go(status: BookingStatus) {
    mutations.transitionBooking(b!.id, status);
  }

  return (
    <>
      <TopBar title="Job request" back />
      <div className="screen" style={{ paddingTop: 0 }}>
        <Card className="row gap">
          <Avatar name={customer?.fullName ?? 'Customer'} color={customer?.avatarColor ?? '#888'} size={48} />
          <div className="grow">
            <div className="semibold">{customer?.fullName ?? 'Customer'}</div>
            <div className="muted small">{customer?.phone}</div>
          </div>
          <StatusBadge status={b.status} />
        </Card>

        <Card className="mt">
          <div className="muted tiny">Job details</div>
          <p className="mt-sm">{b.description}</p>
          <div className="muted small mt-sm">📍 {b.addressText}</div>
          {b.isEmergency && <span className="badge danger mt-sm">🚨 Emergency</span>}
          <div className="row between mt">
            <span className="muted small">Payout</span>
            <span className="bold">₦{b.price.toLocaleString()}</span>
          </div>
        </Card>

        <div className="stack mt">
          <a
            className="btn secondary"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.addressText)}`}
            target="_blank"
            rel="noreferrer"
          >
            🗺️ Open in Maps
          </a>
          <button className="btn secondary" onClick={() => nav(`/app/chat/${b.id}`)}>💬 Chat with customer</button>

          {b.status === 'requested' && (
            <div className="row gap">
              <button className="btn danger" style={{ flex: 1 }} onClick={() => go('rejected')}>Reject</button>
              <button className="btn success" style={{ flex: 2 }} onClick={() => go('accepted')}>Accept job</button>
            </div>
          )}
          {b.status === 'accepted' && <button className="btn primary" onClick={() => go('en_route')}>I'm on my way</button>}
          {b.status === 'en_route' && <button className="btn primary" onClick={() => go('in_progress')}>Start working</button>}
          {b.status === 'in_progress' && <button className="btn success" onClick={() => go('completed')}>Mark complete</button>}
        </div>
      </div>
    </>
  );
}
