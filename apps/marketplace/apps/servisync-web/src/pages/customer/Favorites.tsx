import { useNavigate } from 'react-router-dom';
import { useSession, useDbVersion } from '../../lib/store';
import { queries } from '../../lib/db';
import { Avatar, Card, Rating, TopBar } from '../../components/UI';

export function Favorites() {
  useDbVersion();
  const { user } = useSession();
  const nav = useNavigate();
  const favs = user ? queries.favoritesForUser(user.id) : [];

  return (
    <>
      <TopBar title="Saved artisans" />
      <div className="screen" style={{ paddingTop: 0 }}>
        {favs.length === 0 && <div className="empty">No saved artisans yet. Tap the heart on a profile to save them.</div>}
        <div className="stack">
          {favs.map((a) => (
            <Card key={a.id} onClick={() => nav(`/app/artisan/${a.id}`)} className="row gap">
              <Avatar name={a.fullName} color={a.avatarColor} size={46} />
              <div className="grow">
                <div className="semibold">{a.fullName}</div>
                <Rating value={a.rating} count={a.ratingCount} />
              </div>
              <span>›</span>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
