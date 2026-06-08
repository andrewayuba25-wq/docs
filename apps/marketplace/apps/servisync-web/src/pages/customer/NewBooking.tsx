import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSession } from '../../lib/store';
import { mutations, queries } from '../../lib/db';
import { Avatar, Card, TopBar } from '../../components/UI';

export function NewBooking() {
  const { artisanId } = useParams();
  const { user } = useSession();
  const nav = useNavigate();
  const artisan = artisanId ? queries.artisanById(artisanId) : undefined;

  const [categorySlug, setCategorySlug] = useState(artisan?.categorySlugs[0] ?? '');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [emergency, setEmergency] = useState(false);
  const [err, setErr] = useState('');

  if (!artisan || !user) {
    return (<><TopBar title="Book" back /><div className="empty">Artisan not found.</div></>);
  }

  function submit() {
    if (description.trim().length < 5) { setErr('Please describe the job (at least 5 characters).'); return; }
    if (address.trim().length < 3) { setErr('Please enter an address.'); return; }
    const booking = mutations.createBooking({
      customerId: user!.id,
      artisanId: artisan!.id,
      categorySlug: categorySlug || artisan!.categorySlugs[0] || 'plumber',
      description: description.trim(),
      addressText: address.trim(),
      isEmergency: emergency,
    });
    nav(`/app/booking/${booking.id}`, { replace: true });
  }

  return (
    <>
      <TopBar title="Request a booking" back />
      <div className="screen" style={{ paddingTop: 0 }}>
        <Card className="row gap">
          <Avatar name={artisan.fullName} color={artisan.avatarColor} size={48} />
          <div className="grow">
            <div className="semibold">{artisan.fullName}</div>
            <div className="muted small">Base price ₦{artisan.baseRate.toLocaleString()}</div>
          </div>
        </Card>

        <div className="stack mt">
          {artisan.categorySlugs.length > 1 && (
            <div>
              <label className="label">Service</label>
              <select className="select" value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)}>
                {artisan.categorySlugs.map((s) => (
                  <option key={s} value={s}>{queries.categoryBySlug(s)?.name ?? s}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">Describe the job</label>
            <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Leaking pipe under the kitchen sink" />
          </div>
          <div>
            <label className="label">Address</label>
            <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, area, landmark" />
          </div>
          <label className="row gap-sm small">
            <input type="checkbox" checked={emergency} onChange={(e) => setEmergency(e.target.checked)} />
            🚨 This is an emergency
          </label>
          {err && <p className="small" style={{ color: 'var(--danger)' }}>{err}</p>}

          <Card className="row between">
            <span className="muted small">Estimated price</span>
            <span className="bold">₦{artisan.baseRate.toLocaleString()}</span>
          </Card>

          <button className="btn primary" onClick={submit}>Send request</button>
        </div>
      </div>
    </>
  );
}
