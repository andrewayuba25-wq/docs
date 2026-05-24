import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../lib/store';
import { mutations } from '../lib/db';

export function RoleSelect() {
  const { user, refresh } = useSession();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [role, setRole] = useState<'customer' | 'artisan'>('customer');

  function finish() {
    if (!user) return;
    const fullName = name.trim() || (role === 'artisan' ? 'New Pro' : 'New Customer');
    mutations.updateUser(user.id, { fullName, role });
    mutations.setRole(user.id, role);
    refresh();
    nav(role === 'artisan' ? '/pro/dashboard' : '/app/home', { replace: true });
  }

  return (
    <div className="screen no-nav" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <h1 className="title">Welcome! 👋</h1>
      <p className="muted mt-sm">Tell us a little about you.</p>

      <div className="stack mt">
        <div>
          <label className="label">Your name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tunde Bello" />
        </div>

        <label className="label">How will you use ServiSync?</label>
        <div
          className={`card tap row gap ${role === 'customer' ? '' : ''}`}
          style={{ borderColor: role === 'customer' ? 'var(--primary)' : 'var(--border)', borderWidth: 2 }}
          onClick={() => setRole('customer')}
        >
          <div style={{ fontSize: 30 }}>🔍</div>
          <div className="grow">
            <div className="semibold">I need a service</div>
            <div className="muted small">Find and book trusted artisans nearby.</div>
          </div>
          <input type="radio" checked={role === 'customer'} readOnly />
        </div>

        <div
          className="card tap row gap"
          style={{ borderColor: role === 'artisan' ? 'var(--primary)' : 'var(--border)', borderWidth: 2 }}
          onClick={() => setRole('artisan')}
        >
          <div style={{ fontSize: 30 }}>🛠️</div>
          <div className="grow">
            <div className="semibold">I provide a service</div>
            <div className="muted small">Get booking requests and earn from your skills.</div>
          </div>
          <input type="radio" checked={role === 'artisan'} readOnly />
        </div>

        <button className="btn primary mt" onClick={finish}>Continue</button>
      </div>
    </div>
  );
}
