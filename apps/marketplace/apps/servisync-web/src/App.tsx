import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useSession } from './lib/store';
import { BottomNav } from './components/BottomNav';

import { Onboarding } from './pages/Onboarding';
import { Login } from './pages/Login';
import { RoleSelect } from './pages/RoleSelect';

import { CustomerHome } from './pages/customer/Home';
import { Search } from './pages/customer/Search';
import { ArtisanDetail } from './pages/customer/ArtisanDetail';
import { NewBooking } from './pages/customer/NewBooking';
import { BookingDetail } from './pages/customer/BookingDetail';
import { Bookings } from './pages/customer/Bookings';
import { Chat } from './pages/customer/Chat';
import { Favorites } from './pages/customer/Favorites';
import { Profile } from './pages/customer/Profile';

import { ProDashboard } from './pages/artisan/Dashboard';
import { JobDetail } from './pages/artisan/JobDetail';
import { Earnings } from './pages/artisan/Earnings';
import { ProProfile } from './pages/artisan/ProProfile';

import { AdminDashboard } from './pages/admin/Dashboard';

export function App() {
  const { user } = useSession();
  const loc = useLocation();

  // Unauthenticated: onboarding + login only.
  if (!user) {
    return (
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<Onboarding />} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    );
  }

  // Authenticated but no role picked yet.
  if (!user.fullName) {
    return (
      <div className="app-shell">
        <Routes>
          <Route path="*" element={<RoleSelect />} />
        </Routes>
      </div>
    );
  }

  const isPro = user.role === 'artisan';
  const isAdmin = user.role === 'admin';
  const showNav =
    !loc.pathname.startsWith('/app/chat') &&
    (loc.pathname.startsWith('/app') || loc.pathname.startsWith('/pro'));

  return (
    <div className="app-shell">
      <Routes>
        {/* Customer */}
        <Route path="/app/home" element={<CustomerHome />} />
        <Route path="/app/search" element={<Search />} />
        <Route path="/app/artisan/:id" element={<ArtisanDetail />} />
        <Route path="/app/book/:artisanId" element={<NewBooking />} />
        <Route path="/app/booking/:id" element={<BookingDetail />} />
        <Route path="/app/bookings" element={<Bookings />} />
        <Route path="/app/chat/:bookingId" element={<Chat />} />
        <Route path="/app/favorites" element={<Favorites />} />
        <Route path="/app/profile" element={<Profile />} />

        {/* Artisan */}
        <Route path="/pro/dashboard" element={<ProDashboard />} />
        <Route path="/pro/job/:id" element={<JobDetail />} />
        <Route path="/pro/earnings" element={<Earnings />} />
        <Route path="/pro/profile" element={<ProProfile />} />

        {/* Admin */}
        <Route path="/admin" element={<AdminDashboard />} />

        <Route
          path="*"
          element={<Navigate to={isAdmin ? '/admin' : isPro ? '/pro/dashboard' : '/app/home'} replace />}
        />
      </Routes>

      {showNav && !isAdmin && <BottomNav role={isPro ? 'artisan' : 'customer'} />}
    </div>
  );
}
