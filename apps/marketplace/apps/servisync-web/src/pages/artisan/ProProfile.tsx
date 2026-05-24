import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession, useDbVersion } from '../../lib/store';
import { mutations, queries } from '../../lib/db';
import { Avatar, Card, TopBar } from '../../components/UI';

export function ProProfile() {
  useDbVersion();
  const { user, theme, toggleTheme, logout } = useSession();
  const nav = useNavigate();
  const artisan = user ? queries.artisanById(user.id) : undefined;
  const allCats = queries.categories();

  const [bio, setBio] = useState(artisan?.bio ?? '');
  const [baseRate, setBaseRate] = useState(artisan?.baseRate ?? 0);
  const [years, setYears] = useState(artisan?.yearsExperience ?? 0);
  const [cats, setCats] = useState<string[]>(artisan?.categorySlugs ?? []);
  const [saved, setSaved] = useState(false);

  if (!user || !artisan) return null;

  function toggleCat(slug: string) {
    setCats((c) => (c.includes(slug) ? c.filter((x) => x !== slug) : [...c, slug].slice(0, 5)));
  }

  function save() {
    mutations.updateArtisan(artisan!.id, {
      bio: bio.trim(),
      baseRate: Number(baseRate) || 0,
      yearsExperience: Number(years) || 0,
      categorySlugs: cats,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <>
      <TopBar title="My profile" right={<button className="icon-btn" onClick={toggleTheme}>{theme === 'dark' ? '☀️' : '🌙'}</button>} />
      <div className="screen" style={{ paddingTop: 0 }}>
        <div className="col center gap-sm">
          <Avatar name={user.fullName} color={user.avatarColor} size={84} />
          <div className="row gap-sm">
            <span className="title" style={{ fontSize: 22 }}>{user.fullName}</span>
            {artisan.verified ? <span className="badge ok">Verified</span> : <span className="badge warn">Pending</span>}
          </div>
          <div className="muted small">★ {artisan.rating.toFixed(1)} · {artisan.completedJobs} jobs</div>
        </div>

        <div className="stack mt">
          <div>
            <label className="label">Services you offer (max 5)</label>
            <div className="row wrap gap-sm">
              {allCats.map((c) => (
                <button key={c.id} className={`chip ${cats.includes(c.slug) ? 'active' : ''}`} onClick={() => toggleCat(c.slug)}>
                  {c.icon} {c.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Bio</label>
            <textarea className="textarea" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell customers about your experience…" style={{ minHeight: 90 }} />
          </div>
          <div className="row gap">
            <div className="grow">
              <label className="label">Base rate (₦)</label>
              <input className="input" type="number" value={baseRate} onChange={(e) => setBaseRate(+e.target.value)} />
            </div>
            <div className="grow">
              <label className="label">Years experience</label>
              <input className="input" type="number" value={years} onChange={(e) => setYears(+e.target.value)} />
            </div>
          </div>

          <Card className="row between">
            <span className="small muted">📄 Verification documents</span>
            <button className="btn secondary sm" onClick={() => alert('Document upload is stubbed in this demo. An admin can verify you from the Admin console.')}>Upload</button>
          </Card>

          <button className="btn primary" onClick={save}>{saved ? '✓ Saved' : 'Save profile'}</button>
          <button className="btn danger" onClick={() => { logout(); nav('/', { replace: true }); }}>Sign out</button>
        </div>
      </div>
    </>
  );
}
