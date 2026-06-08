import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession, useDbVersion } from '../../lib/store';
import { mutations, queries } from '../../lib/db';
import { Card, StatusBadge } from '../../components/UI';

type Tab = 'overview' | 'verifications' | 'users' | 'bookings';

export function AdminDashboard() {
  useDbVersion();
  const { logout } = useSession();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const m = queries.metrics();

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', width: '100%' }}>
      <div className="topbar">
        <h1>⚙️ Admin Console</h1>
        <button className="btn danger sm" onClick={() => { logout(); nav('/', { replace: true }); }}>Sign out</button>
      </div>

      <div className="screen no-nav" style={{ paddingTop: 0 }}>
        <div className="hscroll mb">
          {(['overview', 'verifications', 'users', 'bookings'] as Tab[]).map((t) => (
            <button key={t} className={`chip ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t[0]!.toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="cat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <Metric label="Users" value={m.users} />
            <Metric label="Artisans" value={m.artisans} />
            <Metric label="Bookings" value={m.bookings} />
            <Metric label="Completed" value={m.completed} />
            <Metric label="Pending KYC" value={m.pendingVerification} />
            <Metric label="Open reports" value={m.openReports} />
          </div>
        )}

        {tab === 'verifications' && <Verifications />}
        {tab === 'users' && <Users />}
        {tab === 'bookings' && <BookingsTable />}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="col center">
      <div className="muted tiny">{label}</div>
      <div className="bold" style={{ fontSize: 24 }}>{value}</div>
    </Card>
  );
}

function Verifications() {
  const pending = queries.unverifiedArtisans();
  return (
    <Card>
      <div className="semibold mb">Pending verifications ({pending.length})</div>
      <table className="table">
        <thead><tr><th>Artisan</th><th>Services</th><th>Jobs</th><th></th></tr></thead>
        <tbody>
          {pending.length === 0 && <tr><td colSpan={4} className="muted">All artisans verified.</td></tr>}
          {pending.map((a) => (
            <tr key={a.id}>
              <td>{a.fullName}</td>
              <td className="muted" style={{ textTransform: 'capitalize' }}>{a.categorySlugs.join(', ') || '—'}</td>
              <td>{a.completedJobs}</td>
              <td className="row gap-sm">
                <button className="btn success sm" onClick={() => mutations.verifyArtisan(a.id, true)}>Approve</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function Users() {
  const users = queries.allUsers();
  return (
    <Card>
      <div className="semibold mb">Users ({users.length})</div>
      <table className="table">
        <thead><tr><th>Name</th><th>Role</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.fullName || '—'}<div className="muted tiny">{u.phone}</div></td>
              <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
              <td><StatusBadge status={u.status} /></td>
              <td>
                {u.role !== 'admin' && (
                  u.status === 'active'
                    ? <button className="btn danger sm" onClick={() => mutations.setUserStatus(u.id, 'suspended')}>Suspend</button>
                    : <button className="btn success sm" onClick={() => mutations.setUserStatus(u.id, 'active')}>Reinstate</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function BookingsTable() {
  const bookings = queries.allBookings();
  return (
    <Card>
      <div className="semibold mb">All bookings ({bookings.length})</div>
      <table className="table">
        <thead><tr><th>Service</th><th>Customer</th><th>Artisan</th><th>Status</th><th>₦</th></tr></thead>
        <tbody>
          {bookings.length === 0 && <tr><td colSpan={5} className="muted">No bookings yet.</td></tr>}
          {bookings.map((b) => (
            <tr key={b.id}>
              <td style={{ textTransform: 'capitalize' }}>{queries.categoryBySlug(b.categorySlug)?.name}</td>
              <td>{queries.userById(b.customerId)?.fullName ?? '—'}</td>
              <td>{queries.artisanById(b.artisanId)?.fullName ?? '—'}</td>
              <td><StatusBadge status={b.status} /></td>
              <td>{b.price.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
