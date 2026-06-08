import type {
  Artisan, Booking, BookingStatus, ChatMessage, DB, Review, User,
} from './types';
import { buildSeed } from './seed';

const STORAGE_KEY = 'servisync.db.v1';

// ---- Persistence ------------------------------------------------------------

function load(): DB {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DB;
  } catch {
    /* fall through to seed */
  }
  const seeded = buildSeed();
  persist(seeded);
  return seeded;
}

let db: DB = load();

function persist(next: DB) {
  db = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage full / unavailable — keep in-memory */
  }
  emit();
}

// ---- Reactive subscriptions (tiny pub/sub for React) ------------------------

type Listener = () => void;
const listeners = new Set<Listener>();
function emit() {
  listeners.forEach((l) => l());
}
export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

// ---- Queries ----------------------------------------------------------------

export const queries = {
  snapshot: (): DB => db,
  categories: () => db.categories.filter((c) => c.active),
  allCategories: () => db.categories,
  categoryBySlug: (slug: string) => db.categories.find((c) => c.slug === slug),

  userByPhone: (phone: string) => db.users.find((u) => u.phone === phone),
  userById: (id: string) => db.users.find((u) => u.id === id),

  artisanById: (id: string) => db.artisans.find((a) => a.id === id),

  searchArtisans: (opts: {
    categorySlug?: string;
    availableOnly?: boolean;
  }): Artisan[] => {
    return db.artisans.filter((a) => {
      if (opts.categorySlug && !a.categorySlugs.includes(opts.categorySlug)) return false;
      if (opts.availableOnly && !a.available) return false;
      return true;
    });
  },

  reviewsForArtisan: (artisanId: string): Review[] =>
    db.reviews.filter((r) => r.artisanId === artisanId).sort(byNewest),

  bookingsForCustomer: (customerId: string): Booking[] =>
    db.bookings.filter((b) => b.customerId === customerId).sort(byNewest),

  bookingsForArtisan: (artisanId: string): Booking[] =>
    db.bookings.filter((b) => b.artisanId === artisanId).sort(byNewest),

  bookingById: (id: string) => db.bookings.find((b) => b.id === id),

  messagesForBooking: (bookingId: string): ChatMessage[] =>
    db.messages.filter((m) => m.bookingId === bookingId).sort(byOldest),

  favoritesForUser: (userId: string): Artisan[] => {
    const ids = db.favorites.filter((f) => f.userId === userId).map((f) => f.artisanId);
    return db.artisans.filter((a) => ids.includes(a.id));
  },

  isFavorite: (userId: string, artisanId: string) =>
    db.favorites.some((f) => f.userId === userId && f.artisanId === artisanId),

  metrics: () => ({
    users: db.users.length,
    artisans: db.artisans.length,
    bookings: db.bookings.length,
    completed: db.bookings.filter((b) => b.status === 'completed').length,
    pendingVerification: db.artisans.filter((a) => !a.verified).length,
    openReports: db.reports.filter((r) => r.status === 'open').length,
  }),

  allUsers: () => db.users,
  allBookings: () => db.bookings.slice().sort(byNewest),
  unverifiedArtisans: () => db.artisans.filter((a) => !a.verified),
};

function byNewest(a: { createdAt: string }, b: { createdAt: string }) {
  return b.createdAt.localeCompare(a.createdAt);
}
function byOldest(a: { createdAt: string }, b: { createdAt: string }) {
  return a.createdAt.localeCompare(b.createdAt);
}

// ---- Mutations --------------------------------------------------------------

export const mutations = {
  // Auth: mock OTP login. Returns existing user or creates a new customer.
  loginOrCreate: (phone: string, role: 'customer' | 'artisan'): User => {
    let user = db.users.find((u) => u.phone === phone);
    if (!user) {
      user = {
        id: uid(), phone, role, fullName: '', avatarColor: '#2563EB',
        status: 'active', createdAt: now(),
      };
      persist({ ...db, users: [...db.users, user] });
    }
    return user;
  },

  setRole: (userId: string, role: 'customer' | 'artisan') => {
    const users = db.users.map((u) => (u.id === userId ? { ...u, role } : u));
    // Spin up a blank artisan profile if needed.
    let artisans = db.artisans;
    if (role === 'artisan' && !db.artisans.some((a) => a.id === userId)) {
      const u = users.find((x) => x.id === userId)!;
      artisans = [
        ...db.artisans,
        {
          id: userId, fullName: u.fullName || 'New Pro', avatarColor: u.avatarColor,
          bio: '', categorySlugs: [], yearsExperience: 0, baseRate: 0, hourlyRate: 0,
          available: false, verified: false, rating: 0, ratingCount: 0, completedJobs: 0,
          lat: 6.5244, lng: 3.3792, phone: u.phone, portfolio: [],
        },
      ];
    }
    persist({ ...db, users, artisans });
  },

  updateUser: (userId: string, patch: Partial<User>) => {
    persist({ ...db, users: db.users.map((u) => (u.id === userId ? { ...u, ...patch } : u)) });
  },

  updateArtisan: (artisanId: string, patch: Partial<Artisan>) => {
    persist({ ...db, artisans: db.artisans.map((a) => (a.id === artisanId ? { ...a, ...patch } : a)) });
  },

  toggleFavorite: (userId: string, artisanId: string) => {
    const exists = db.favorites.some((f) => f.userId === userId && f.artisanId === artisanId);
    const favorites = exists
      ? db.favorites.filter((f) => !(f.userId === userId && f.artisanId === artisanId))
      : [...db.favorites, { userId, artisanId }];
    persist({ ...db, favorites });
  },

  createBooking: (input: {
    customerId: string; artisanId: string; categorySlug: string;
    description: string; addressText: string; isEmergency: boolean;
  }): Booking => {
    const artisan = db.artisans.find((a) => a.id === input.artisanId);
    const booking: Booking = {
      id: uid(),
      customerId: input.customerId,
      artisanId: input.artisanId,
      categorySlug: input.categorySlug,
      status: 'requested',
      description: input.description,
      addressText: input.addressText,
      price: artisan?.baseRate ?? 0,
      isEmergency: input.isEmergency,
      createdAt: now(),
      updatedAt: now(),
    };
    persist({ ...db, bookings: [...db.bookings, booking] });
    // Seed a system message so the chat thread isn't empty.
    mutations.sendMessage(booking.id, 'system', 'Booking requested. Waiting for the artisan to respond.');
    return booking;
  },

  transitionBooking: (bookingId: string, status: BookingStatus) => {
    persist({
      ...db,
      bookings: db.bookings.map((b) =>
        b.id === bookingId ? { ...b, status, updatedAt: now() } : b,
      ),
    });
  },

  sendMessage: (bookingId: string, senderId: string, body: string): ChatMessage => {
    const msg: ChatMessage = { id: uid(), bookingId, senderId, body, createdAt: now() };
    persist({ ...db, messages: [...db.messages, msg] });
    return msg;
  },

  addReview: (input: {
    bookingId: string; artisanId: string; reviewerId: string;
    reviewerName: string; rating: number; comment: string;
  }) => {
    const review: Review = { id: uid(), createdAt: now(), ...input };
    // Recompute artisan rolling average.
    const artisan = db.artisans.find((a) => a.id === input.artisanId);
    let artisans = db.artisans;
    if (artisan) {
      const newCount = artisan.ratingCount + 1;
      const newAvg = (artisan.rating * artisan.ratingCount + input.rating) / newCount;
      artisans = db.artisans.map((a) =>
        a.id === artisan.id
          ? { ...a, rating: Math.round(newAvg * 10) / 10, ratingCount: newCount, completedJobs: a.completedJobs + 1 }
          : a,
      );
    }
    persist({ ...db, reviews: [...db.reviews, review], artisans });
  },

  // Admin actions
  setUserStatus: (userId: string, status: User['status']) => {
    persist({ ...db, users: db.users.map((u) => (u.id === userId ? { ...u, status } : u)) });
  },

  verifyArtisan: (artisanId: string, verified: boolean) => {
    persist({ ...db, artisans: db.artisans.map((a) => (a.id === artisanId ? { ...a, verified } : a)) });
  },

  resetData: () => {
    localStorage.removeItem(STORAGE_KEY);
    persist(buildSeed());
  },
};
