import { useNavigate } from 'react-router-dom';
import { useSession } from '../../lib/store';
import { mutations } from '../../lib/db';
import { Avatar, Card, TopBar } from '../../components/UI';

export function Profile() {
  const { user, theme, toggleTheme, logout } = useSession();
  const nav = useNavigate();
  if (!user) return null;

  function becomeArtisan() {
    mutations.setRole(user!.id, 'artisan');
    nav('/pro/dashboard', { replace: true });
  }

  return (
    <>
      <TopBar title="Profile" />
      <div className="screen" style={{ paddingTop: 0 }}>
        <div className="col center gap-sm">
          <Avatar name={user.fullName} color={user.avatarColor} size={84} />
          <div className="title" style={{ fontSize: 22 }}>{user.fullName}</div>
          <div className="muted small">{user.phone}</div>
        </div>

        <div className="stack mt">
          <Card className="row between">
            <span>🌙 Dark mode</span>
            <button className="btn secondary sm" onClick={toggleTheme}>{theme === 'dark' ? 'On' : 'Off'}</button>
          </Card>
          <Card className="row between" onClick={() => nav('/app/bookings')}>
            <span>📋 My bookings</span><span>›</span>
          </Card>
          <Card className="row between" onClick={() => nav('/app/favorites')}>
            <span>❤️ Saved artisans</span><span>›</span>
          </Card>
          <Card className="row between" onClick={becomeArtisan}>
            <span>🛠️ Become an artisan</span><span>›</span>
          </Card>
          <Card className="row between" onClick={() => { if (confirm('Reset all demo data?')) mutations.resetData(); }}>
            <span>♻️ Reset demo data</span><span>›</span>
          </Card>
          <button className="btn danger mt" onClick={() => { logout(); nav('/', { replace: true }); }}>Sign out</button>
        </div>
      </div>
    </>
  );
}
