import { useNavigate, useParams } from 'react-router-dom';
import { useSession, useDbVersion } from '../../lib/store';
import { mutations, queries } from '../../lib/db';
import { distanceKm, formatDistance } from '../../lib/geo';
import { SEED_CENTER } from '../../lib/seed';
import { Avatar, Card, Rating, Stars, TopBar } from '../../components/UI';

export function ArtisanDetail() {
  useDbVersion();
  const { id } = useParams();
  const { user } = useSession();
  const nav = useNavigate();
  const artisan = id ? queries.artisanById(id) : undefined;

  if (!artisan) {
    return (
      <>
        <TopBar title="Artisan" back />
        <div className="empty">Artisan not found.</div>
      </>
    );
  }

  const reviews = queries.reviewsForArtisan(artisan.id);
  const isFav = user ? queries.isFavorite(user.id, artisan.id) : false;
  const dist = distanceKm(SEED_CENTER, artisan);

  return (
    <>
      <TopBar
        title="Profile"
        back
        right={
          <button className="icon-btn" onClick={() => user && mutations.toggleFavorite(user.id, artisan.id)}>
            {isFav ? '❤️' : '🤍'}
          </button>
        }
      />
      <div className="screen" style={{ paddingTop: 0 }}>
        <div className="col center gap-sm">
          <Avatar name={artisan.fullName} color={artisan.avatarColor} size={88} />
          <div className="row gap-sm">
            <span className="title" style={{ fontSize: 22 }}>{artisan.fullName}</span>
            {artisan.verified && <span title="Verified">🛡️</span>}
          </div>
          <Rating value={artisan.rating} count={artisan.ratingCount} />
          <div className="muted small" style={{ textTransform: 'capitalize' }}>
            {artisan.categorySlugs.map((s) => s.replace('-', ' ')).join(' · ')} · {artisan.yearsExperience}y exp · {formatDistance(dist)}
          </div>
          {artisan.available
            ? <span className="badge ok">Available now</span>
            : <span className="badge warn">Currently offline</span>}
        </div>

        <Card className="mt">
          <div className="semibold mb">About</div>
          <p className="muted small" style={{ lineHeight: 1.5 }}>{artisan.bio || 'No bio yet.'}</p>
        </Card>

        <div className="row gap mt">
          <Card className="grow col center">
            <div className="muted tiny">Base price</div>
            <div className="bold" style={{ fontSize: 18 }}>₦{artisan.baseRate.toLocaleString()}</div>
          </Card>
          <Card className="grow col center">
            <div className="muted tiny">Hourly</div>
            <div className="bold" style={{ fontSize: 18 }}>₦{artisan.hourlyRate.toLocaleString()}</div>
          </Card>
          <Card className="grow col center">
            <div className="muted tiny">Jobs done</div>
            <div className="bold" style={{ fontSize: 18 }}>{artisan.completedJobs}</div>
          </Card>
        </div>

        {artisan.portfolio.length > 0 && (
          <>
            <h2 className="h2 mt">Portfolio</h2>
            <div className="hscroll mt-sm">
              {artisan.portfolio.map((c, i) => (
                <div key={i} style={{ width: 120, height: 90, borderRadius: 12, background: c, flexShrink: 0, opacity: 0.85 }} />
              ))}
            </div>
          </>
        )}

        <h2 className="h2 mt">Reviews</h2>
        <div className="stack mt-sm">
          {reviews.length === 0 && <div className="muted small">No reviews yet.</div>}
          {reviews.map((r) => (
            <Card key={r.id}>
              <div className="row between">
                <span className="semibold small">{r.reviewerName}</span>
                <Stars value={r.rating} />
              </div>
              {r.comment && <p className="muted small mt-sm">{r.comment}</p>}
            </Card>
          ))}
        </div>
      </div>

      {/* Sticky action bar */}
      <div style={{ position: 'sticky', bottom: 0, background: 'var(--bg)', padding: 12, display: 'flex', gap: 10, borderTop: '1px solid var(--border)' }}>
        <a href={`tel:${artisan.phone}`} className="btn secondary" style={{ flex: 1 }}>📞 Call</a>
        <button className="btn primary" style={{ flex: 2 }} onClick={() => nav(`/app/book/${artisan.id}`)}>
          Book this pro
        </button>
      </div>
    </>
  );
}
