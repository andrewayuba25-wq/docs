import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDbVersion } from '../../lib/store';
import { queries } from '../../lib/db';
import { distanceKm, formatDistance } from '../../lib/geo';
import { SEED_CENTER } from '../../lib/seed';
import { Avatar, Card, Rating, TopBar } from '../../components/UI';

type Sort = 'distance' | 'rating' | 'price';

export function Search() {
  const dbVersion = useDbVersion();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const category = params.get('category') ?? undefined;
  const emergency = params.get('emergency') === '1';

  const [sort, setSort] = useState<Sort>('distance');
  const [maxDist, setMaxDist] = useState(20);
  const [availableOnly, setAvailableOnly] = useState(emergency);
  const categories = queries.categories();

  const results = useMemo(() => {
    const list = queries
      .searchArtisans({ categorySlug: category, availableOnly })
      .map((a) => ({ ...a, dist: distanceKm(SEED_CENTER, a) }))
      .filter((a) => a.dist <= maxDist);
    list.sort((a, b) => {
      if (sort === 'rating') return b.rating - a.rating;
      if (sort === 'price') return a.baseRate - b.baseRate;
      return a.dist - b.dist;
    });
    return list;
  }, [category, availableOnly, maxDist, sort, dbVersion]);

  return (
    <>
      <TopBar title={emergency ? '🚨 Emergency' : category ? cap(category) : 'Explore'} back />
      <div className="screen" style={{ paddingTop: 0 }}>
        {/* Category chips */}
        <div className="hscroll mb">
          <button
            className={`chip ${!category ? 'active' : ''}`}
            onClick={() => setParams(emergency ? { emergency: '1' } : {})}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={`chip ${category === c.slug ? 'active' : ''}`}
              onClick={() => setParams({ category: c.slug, ...(emergency ? { emergency: '1' } : {}) })}
            >
              {c.icon} {c.name}
            </button>
          ))}
        </div>

        {/* Filters */}
        <Card className="stack">
          <div className="row between">
            <span className="label" style={{ margin: 0 }}>Sort by</span>
            <div className="row gap-sm">
              {(['distance', 'rating', 'price'] as Sort[]).map((s) => (
                <button key={s} className={`chip ${sort === s ? 'active' : ''}`} onClick={() => setSort(s)}>
                  {cap(s)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="row between small">
              <span className="muted">Max distance</span>
              <span className="semibold">{maxDist} km</span>
            </div>
            <input type="range" min={1} max={30} value={maxDist} onChange={(e) => setMaxDist(+e.target.value)} style={{ width: '100%' }} />
          </div>
          <label className="row gap-sm small">
            <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} />
            Available now only
          </label>
        </Card>

        <div className="muted small mt mb">{results.length} artisan{results.length === 1 ? '' : 's'} found</div>

        <div className="stack">
          {results.map((a) => (
            <Card key={a.id} onClick={() => nav(`/app/artisan/${a.id}`)} className="row gap">
              <Avatar name={a.fullName} color={a.avatarColor} size={54} />
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="row gap-sm">
                  <span className="semibold">{a.fullName}</span>
                  {a.verified && <span title="Verified">🛡️</span>}
                </div>
                <div className="muted tiny" style={{ textTransform: 'capitalize' }}>
                  {a.categorySlugs.map((s) => s.replace('-', ' ')).join(' · ')}
                </div>
                <div className="row gap mt-sm small">
                  <Rating value={a.rating} count={a.ratingCount} />
                  <span className="muted">{formatDistance(a.dist)}</span>
                  <span className="semibold">₦{a.baseRate.toLocaleString()}</span>
                </div>
              </div>
              {a.available && <span className="badge ok">Open</span>}
            </Card>
          ))}
          {results.length === 0 && <div className="empty">No artisans match these filters.</div>}
        </div>
      </div>
    </>
  );
}

function cap(s: string) {
  return s.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
