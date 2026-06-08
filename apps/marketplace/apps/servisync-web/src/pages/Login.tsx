import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../lib/store';
import { queries } from '../lib/db';

type Step = 'phone' | 'otp';

export function Login() {
  const { login } = useSession();
  const nav = useNavigate();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('+234');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  // Mock OTP — any 6 digits work. We surface a fake "sent" code for realism.
  const [sentCode] = useState(() => Math.floor(100000 + Math.random() * 900000).toString());

  function requestOtp() {
    if (!/^\+\d{6,15}$/.test(phone)) {
      setErr('Enter a valid phone number, e.g. +2348012345678');
      return;
    }
    setErr('');
    setStep('otp');
  }

  function verify() {
    if (code.length !== 6) {
      setErr('Enter the 6-digit code.');
      return;
    }
    // Decide role: known demo numbers map to their seeded roles.
    const existing = queries.userByPhone(phone);
    const role = existing?.role === 'admin' ? 'admin' : existing?.role ?? 'customer';
    const user = login(phone, role === 'admin' ? 'customer' : role);
    // Admins are seeded; route them straight to the console.
    if (existing?.role === 'admin') {
      nav('/admin', { replace: true });
      return;
    }
    if (!user.fullName) {
      nav('/', { replace: true }); // RoleSelect intercepts when name is blank
    } else {
      nav(user.role === 'artisan' ? '/pro/dashboard' : '/app/home', { replace: true });
    }
  }

  return (
    <div className="screen no-nav" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="hero-emoji" style={{ fontSize: 48, textAlign: 'center' }}>🔧</div>
      <h1 className="title" style={{ textAlign: 'center', marginTop: 8 }}>ServiSync Pro Connect</h1>

      {step === 'phone' ? (
        <div className="stack mt">
          <p className="muted" style={{ textAlign: 'center' }}>
            Enter your phone number to continue.
          </p>
          <div>
            <label className="label">Phone number</label>
            <input
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              placeholder="+2348012345678"
            />
          </div>
          {err && <p className="small" style={{ color: 'var(--danger)' }}>{err}</p>}
          <button className="btn primary" onClick={requestOtp}>Send code</button>
          <div className="card small muted">
            <b>Demo logins</b>
            <div className="mt-sm">Customer: <code>+2348010000001</code></div>
            <div>Artisan: <code>+2348020000010</code></div>
            <div>Admin: <code>+10000000000</code></div>
            <div className="mt-sm">Any 6-digit code works.</div>
          </div>
        </div>
      ) : (
        <div className="stack mt">
          <p className="muted" style={{ textAlign: 'center' }}>
            We sent a code to {phone}.<br />
            <span className="tiny">(Demo code: <b>{sentCode}</b> — or any 6 digits)</span>
          </p>
          <input
            className="input"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            placeholder="••••••"
            style={{ textAlign: 'center', fontSize: 28, letterSpacing: 10 }}
          />
          {err && <p className="small" style={{ color: 'var(--danger)' }}>{err}</p>}
          <button className="btn primary" onClick={verify}>Verify &amp; continue</button>
          <button className="btn ghost" onClick={() => setStep('phone')}>Change number</button>
        </div>
      )}
    </div>
  );
}
