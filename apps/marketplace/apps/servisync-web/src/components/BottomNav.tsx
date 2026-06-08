import { NavLink } from 'react-router-dom';

const customerTabs = [
  { to: '/app/home', ico: '🏠', label: 'Home' },
  { to: '/app/search', ico: '🔍', label: 'Explore' },
  { to: '/app/bookings', ico: '📋', label: 'Bookings' },
  { to: '/app/favorites', ico: '❤️', label: 'Saved' },
  { to: '/app/profile', ico: '👤', label: 'Profile' },
];

const artisanTabs = [
  { to: '/pro/dashboard', ico: '🏠', label: 'Jobs' },
  { to: '/pro/earnings', ico: '💰', label: 'Earnings' },
  { to: '/pro/profile', ico: '👤', label: 'Profile' },
];

export function BottomNav({ role }: { role: 'customer' | 'artisan' }) {
  const tabs = role === 'artisan' ? artisanTabs : customerTabs;
  return (
    <nav className="bottom-nav">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="ico">{t.ico}</span>
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
