import { useNavigate } from 'react-router-dom';
import { useSession, useDbVersion } from '../../lib/store';
import { queries } from '../../lib/db';
import { Avatar, Card, StatusBadge, TopBar } from '../../components/UI';

export function Bookings() {
  useDbVersion();
  const { user } = useSession();
  const nav = useNavigate();
  const bookings = user ? queries.bookingsForCustomer(user.id) : [];

  return (
    <>
      <TopBar title="My bookings" />
      <div className="screen" style={{ paddingTop: 0 }}>
        {bookings.length === 0 && <div className="empty">No bookings yet. Find an artisan to get started.</div>}
        <div className="stack">
          {bookings.map((b) => {
            const art = queries.artisanById(b.artisanId);
            return (
              <Card key={b.id} onClick={() => nav(`/app/booking/${b.id}`)} className="row gap">
                <Avatar name={art?.fullName ?? '?'} color={art?.avatarColor ?? '#888'} size={46} />
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="semibold">{art?.fullName}</div>
                  <div className="muted small" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {b.description}
                  </div>
                </div>
                <StatusBadge status={b.status} />
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
