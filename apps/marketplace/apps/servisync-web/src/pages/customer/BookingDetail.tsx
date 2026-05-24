import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSession, useDbVersion } from '../../lib/store';
import { mutations, queries } from '../../lib/db';
import type { BookingStatus } from '../../lib/types';
import { Avatar, Card, Stars, StatusBadge, TopBar } from '../../components/UI';

const STAGES: BookingStatus[] = ['requested', 'accepted', 'en_route', 'in_progress', 'completed'];

export function BookingDetail() {
  useDbVersion();
  const { id } = useParams();
  const { user } = useSession();
  const nav = useNavigate();
  const booking = id ? queries.bookingById(id) : undefined;
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  if (!booking || !user) {
    return (<><TopBar title="Booking" back /><div className="empty">Booking not found.</div></>);
  }

  const artisan = queries.artisanById(booking.artisanId);
  const stageIdx = STAGES.indexOf(booking.status);
  const hasReview = queries.reviewsForArtisan(booking.artisanId).some((r) => r.bookingId === booking.id);

  function submitReview() {
    mutations.addReview({
      bookingId: booking!.id,
      artisanId: booking!.artisanId,
      reviewerId: user!.id,
      reviewerName: user!.fullName,
      rating,
      comment: comment.trim(),
    });
    setComment('');
  }

  return (
    <>
      <TopBar title="Booking" back />
      <div className="screen" style={{ paddingTop: 0 }}>
        <Card className="row gap">
          <Avatar name={artisan?.fullName ?? '?'} color={artisan?.avatarColor ?? '#888'} size={48} />
          <div className="grow">
            <div className="semibold">{artisan?.fullName}</div>
            <div className="muted small" style={{ textTransform: 'capitalize' }}>
              {queries.categoryBySlug(booking.categorySlug)?.name}
            </div>
          </div>
          <StatusBadge status={booking.status} />
        </Card>

        {/* Progress timeline */}
        {!['cancelled', 'rejected'].includes(booking.status) && (
          <div className="mt">
            <div className="timeline">
              {STAGES.map((_, i) => (
                <div key={i} className={`seg ${i <= stageIdx ? 'done' : ''}`} />
              ))}
            </div>
            <div className="row between tiny muted mt-sm">
              <span>Requested</span><span>En route</span><span>Done</span>
            </div>
          </div>
        )}

        <Card className="mt">
          <div className="muted tiny">Job</div>
          <p className="mt-sm">{booking.description}</p>
          <div className="muted small mt-sm">📍 {booking.addressText}</div>
          {booking.isEmergency && <span className="badge danger mt-sm">🚨 Emergency</span>}
          <div className="row between mt">
            <span className="muted small">Price</span>
            <span className="bold">₦{booking.price.toLocaleString()}</span>
          </div>
        </Card>

        <div className="stack mt">
          <button className="btn secondary" onClick={() => nav(`/app/chat/${booking.id}`)}>💬 Open chat</button>

          {['requested', 'accepted', 'en_route'].includes(booking.status) && (
            <button className="btn danger" onClick={() => mutations.transitionBooking(booking.id, 'cancelled')}>
              Cancel booking
            </button>
          )}

          {booking.status === 'completed' && !hasReview && (
            <Card className="stack">
              <div className="semibold">Rate your experience</div>
              <div className="row gap-sm" style={{ fontSize: 30 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} onClick={() => setRating(n)} style={{ cursor: 'pointer', color: n <= rating ? 'var(--warning)' : 'var(--border)' }}>★</span>
                ))}
              </div>
              <textarea className="textarea" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience (optional)" style={{ minHeight: 80 }} />
              <button className="btn primary" onClick={submitReview}>Submit review</button>
            </Card>
          )}

          {booking.status === 'completed' && hasReview && (
            <Card className="row gap-sm"><Stars value={rating} /><span className="muted small">Thanks for your review!</span></Card>
          )}
        </div>
      </div>
    </>
  );
}
