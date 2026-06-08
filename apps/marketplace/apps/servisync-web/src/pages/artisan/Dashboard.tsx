import { useNavigate } from 'react-router-dom';
import { useSession, useDbVersion } from '../../lib/store';
import { mutations, queries } from '../../lib/db';
import { Avatar, Card, StatusBadge } from '../../components/UI';

export function ProDashboard() {
  useDbVersion();
  const { user, theme, toggleTheme } = useSession();
  const nav = useNavigate();
  if (!user) return null;

  const artisan = queries.artisanById(user.id);
  const jobs = queries.bookingsForArtisan(user.id);
  const incoming = jobs.filter((b) => b.status === 'requested');
  const active = jobs.filter((b) => ['accepted', 'en_route', 'in_progress'].includes(b.status));
  const todayEarnings = jobs
    .filter((b) => b.status === 'completed')
    .reduce((sum, b) => sum + b.price, 0);

  return (
    <>
      <div className="topbar">
        <div className="grow">
          <div className="muted small">Welcome back,</div>
          <h1 style={{ fontSize: 22 }}>{user.fullName.split(' ')[0]} 🛠️</h1>
        </div>
        <button className="icon-btn" onClick={toggleTheme}>{theme === 'dark' ? '☀️' : '🌙'}</button>
      </div>

      <div className="screen" style={{ paddingTop: 0 }}>
        {/* Availability toggle */}
        <Card className="row between">
          <div className="row gap-sm">
            <span style={{ width: 10, height: 10, borderRadius: 5, background: artisan?.available ? 'var(--success)' : 'var(--muted)' }} />
            <span className="semibold">{artisan?.available ? 'You are available' : 'You are offline'}</span>
          </div>
          <button
            className={`btn sm ${artisan?.available ? 'secondary' : 'success'}`}
            onClick={() => artisan && mutations.updateArtisan(artisan.id, { available: !artisan.available })}
          >
            {artisan?.available ? 'Go offline' : 'Go online'}
          </button>
        </Card>

        {!artisan?.verified && (
          <Card className="mt" >
            <span className="badge warn">Pending verification</span>
            <p className="muted small mt-sm">Your account is under review. You can receive jobs once an admin approves your documents.</p>
          </Card>
        )}

        {/* Earnings snapshot */}
        <div className="row gap mt">
          <Card className="grow col center" onClick={() => nav('/pro/earnings')}>
            <div className="muted tiny">Earnings</div>
            <div className="bold" style={{ fontSize: 20 }}>₦{todayEarnings.toLocaleString()}</div>
          </Card>
          <Card className="grow col center">
            <div className="muted tiny">Rating</div>
            <div className="bold" style={{ fontSize: 20 }}>★ {artisan?.rating.toFixed(1) ?? '0.0'}</div>
          </Card>
          <Card className="grow col center">
            <div className="muted tiny">Jobs</div>
            <div className="bold" style={{ fontSize: 20 }}>{artisan?.completedJobs ?? 0}</div>
          </Card>
        </div>

        {active.length > 0 && (
          <>
            <h2 className="h2 mt">Active jobs</h2>
            <div className="stack mt-sm">
              {active.map((b) => <JobRow key={b.id} bookingId={b.id} />)}
            </div>
          </>
        )}

        <h2 className="h2 mt">Incoming requests</h2>
        <div className="stack mt-sm">
          {incoming.length === 0 && <div className="muted small">No new requests. Stay online to get matched.</div>}
          {incoming.map((b) => <JobRow key={b.id} bookingId={b.id} />)}
        </div>
      </div>
    </>
  );
}

function JobRow({ bookingId }: { bookingId: string }) {
  const nav = useNavigate();
  const b = queries.bookingById(bookingId);
  if (!b) return null;
  const customer = queries.userById(b.customerId);
  return (
    <Card onClick={() => nav(`/pro/job/${b.id}`)} className="row gap">
      <Avatar name={customer?.fullName ?? 'Customer'} color={customer?.avatarColor ?? '#888'} size={44} />
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="row gap-sm">
          {b.isEmergency && <span>🚨</span>}
          <span className="semibold">{customer?.fullName ?? 'Customer'}</span>
        </div>
        <div className="muted small" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.description}</div>
      </div>
      <StatusBadge status={b.status} />
    </Card>
  );
}
