import { useNavigate } from 'react-router-dom';
import { useSession, useDbVersion } from '../../lib/store';
import { queries } from '../../lib/db';
import { distanceKm, formatDistance } from '../../lib/geo';
import { SEED_CENTER } from '../../lib/seed';
import { Avatar, Card, Rating } from '../../components/UI';

export function CustomerHome() {
  useDbVersion();
  const { user, theme, toggleTheme } = useSession();
  const nav = useNavigate();
  const categories = queries.categories();
  const topRated = [...queries.searchArtisans({})]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 8);
  const recent = user ? queries.bookingsForCustomer(user.id).slice(0, 2) : [];

  return (
    <>
      <div className="topbar">
        <div className="grow">
          <div className="muted small">Good day,</div>
          <h1 style={{ fontSize: 22 }}>{user?.fullName?.split(' ')[0] ?? 'there'} 👋</h1>
        </div>
        <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      <div className="screen" style={{ paddingTop: 0 }}>
        <Card className="row gap" >
          <span>📍</span>
          <span className="grow small">Lagos, Nigeria · using your area</span>
          <span className="badge info">Change</span>
        </Card>

        <div className="emergency mt" onClick={() => nav('/app/search?emergency=1')} role="button">
          <span style={{ fontSize: 26 }}>🚨</span>
          <div className="grow">
            <div className="bold">Emergency service</div>
            <div className="small" style={{ opacity: 0.9 }}>Reach the nearest available pro now</div>
          </div>
          <span>›</span>
        </div>

        <h2 className="h2 mt">Categories</h2>
        <div className="cat-grid mt-sm">
          {categories.map((c) => (
            <div key={c.id} className="cat-tile" onClick={() => nav(`/app/search?category=${c.slug}`)} role="button">
              <span className="emoji">{c.icon}</span>
              <span className="name">{c.name}</span>
            </div>
          ))}
        </div>

        <div className="row between mt">
          <h2 className="h2">Top rated near you</h2>
          <button className="btn ghost sm" onClick={() => nav('/app/search')}>See all</button>
        </div>
        <div className="hscroll mt-sm">
          {topRated.map((a) => {
            const dist = distanceKm(SEED_CENTER, a);
            return (
              <div
                key={a.id}
                className="card tap"
                style={{ width: 180, flexShrink: 0 }}
                onClick={() => nav(`/app/artisan/${a.id}`)}
                role="button"
              >
                <div className="row gap-sm">
                  <Avatar name={a.fullName} color={a.avatarColor} size={40} />
                  <div className="col grow" style={{ minWidth: 0 }}>
                    <div className="semibold small" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.fullName}
                    </div>
                    <Rating value={a.rating} />
                  </div>
                </div>
                <div className="muted tiny mt-sm" style={{ textTransform: 'capitalize' }}>
                  {a.categorySlugs[0]?.replace('-', ' ')} · {formatDistance(dist)}
                </div>
              </div>
            );
          })}
        </div>

        {recent.length > 0 && (
          <>
            <h2 className="h2 mt">Recent bookings</h2>
            <div className="stack mt-sm">
              {recent.map((b) => {
                const art = queries.artisanById(b.artisanId);
                return (
                  <Card key={b.id} onClick={() => nav(`/app/booking/${b.id}`)} className="row gap">
                    <Avatar name={art?.fullName ?? '?'} color={art?.avatarColor ?? '#888'} size={40} />
                    <div className="grow">
                      <div className="semibold small">{art?.fullName}</div>
                      <div className="muted tiny" style={{ textTransform: 'capitalize' }}>{b.status.replace('_', ' ')}</div>
                    </div>
                    <span>›</span>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}
