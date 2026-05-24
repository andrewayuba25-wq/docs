import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SLIDES = [
  { emoji: '📍', title: 'Find trusted artisans nearby', body: 'Plumbers, electricians, carpenters and more — sorted by distance, rating and price.' },
  { emoji: '⚡', title: 'Book in seconds', body: 'Describe the job, pick a pro, and get matched instantly. Emergency? One tap.' },
  { emoji: '🛡️', title: 'Verified & rated', body: 'Every artisan is ID-verified. Chat in-app and review after every job.' },
];

export function Onboarding() {
  const [i, setI] = useState(0);
  const nav = useNavigate();
  const last = i === SLIDES.length - 1;
  const slide = SLIDES[i]!;

  return (
    <div className="onb">
      <div className="hero-emoji">{slide.emoji}</div>
      <h1 className="title">{slide.title}</h1>
      <p className="muted" style={{ fontSize: 16, lineHeight: 1.5 }}>{slide.body}</p>

      <div className="row center gap-sm mt">
        {SLIDES.map((_, idx) => (
          <span
            key={idx}
            style={{
              width: idx === i ? 22 : 8, height: 8, borderRadius: 4,
              background: idx === i ? 'var(--primary)' : 'var(--border)', transition: 'all .2s',
            }}
          />
        ))}
      </div>

      <div className="stack mt">
        <button className="btn primary" onClick={() => (last ? nav('/login') : setI(i + 1))}>
          {last ? 'Get started' : 'Next'}
        </button>
        {!last && (
          <button className="btn ghost" onClick={() => nav('/login')}>Skip</button>
        )}
      </div>
    </div>
  );
}
