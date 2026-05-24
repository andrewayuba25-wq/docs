import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export function Avatar({ name, color, size = 44 }: { name: string; color: string; size?: number }) {
  const initials = (name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div className="avatar" style={{ width: size, height: size, background: color, fontSize: size / 2.6 }}>
      {initials}
    </div>
  );
}

export function Stars({ value }: { value: number }) {
  const full = Math.round(value);
  return <span className="stars">{'★'.repeat(full)}{'☆'.repeat(5 - full)}</span>;
}

export function Rating({ value, count }: { value: number; count?: number }) {
  return (
    <span className="row gap-sm small semibold">
      <span className="stars">★</span>
      {value.toFixed(1)}
      {count != null && <span className="muted tiny">({count})</span>}
    </span>
  );
}

export function TopBar({ title, back, right }: { title: string; back?: boolean; right?: ReactNode }) {
  const nav = useNavigate();
  return (
    <div className="topbar">
      {back && (
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="Back">←</button>
      )}
      <h1>{title}</h1>
      {right}
    </div>
  );
}

export function Card({
  children, onClick, className = '',
}: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <div className={`card ${onClick ? 'tap' : ''} ${className}`} onClick={onClick} role={onClick ? 'button' : undefined}>
      {children}
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    requested: 'info', accepted: 'info', en_route: 'warn', in_progress: 'warn',
    completed: 'ok', cancelled: 'danger', rejected: 'danger',
    active: 'ok', suspended: 'danger', pending: 'warn',
  };
  const label = status.replace('_', ' ');
  return <span className={`badge ${map[status] ?? 'info'}`}>{label}</span>;
}
