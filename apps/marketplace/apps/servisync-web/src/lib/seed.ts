import type { Artisan, Category, DB, User } from './types';

const COLORS = ['#2563EB', '#16A34A', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#DB2777', '#65A30D'];

export const CATEGORIES: Category[] = [
  { id: 'c1', slug: 'plumber', name: 'Plumber', icon: '🔧', active: true },
  { id: 'c2', slug: 'electrician', name: 'Electrician', icon: '⚡', active: true },
  { id: 'c3', slug: 'carpenter', name: 'Carpenter', icon: '🪚', active: true },
  { id: 'c4', slug: 'painter', name: 'Painter', icon: '🎨', active: true },
  { id: 'c5', slug: 'mechanic', name: 'Mechanic', icon: '🔩', active: true },
  { id: 'c6', slug: 'cleaner', name: 'Cleaner', icon: '🧽', active: true },
  { id: 'c7', slug: 'ac-tech', name: 'AC Technician', icon: '❄️', active: true },
  { id: 'c8', slug: 'mason', name: 'Mason', icon: '🧱', active: true },
];

const NAMES = [
  'Adewale Okafor', 'Ngozi Eze', 'Tunde Bello', 'Aisha Bakare', 'Chinedu Obi',
  'Fatima Yusuf', 'Emeka Nwosu', 'Bisi Adeyemi', 'Ibrahim Sani', 'Funke Lawal',
  'Kunle Ojo', 'Halima Garba', 'Segun Adebayo', 'Amaka Onyeka', 'Yusuf Mohammed',
  'Chioma Igwe', 'Olumide Fashola', 'Zainab Aliyu', 'Tobi Akande', 'Sade Ogunyemi',
];

const BIOS = [
  'Reliable, fast, and tidy. I treat every home like my own.',
  'Over a decade of hands-on experience. Quality guaranteed.',
  'Available for emergencies. No job too small.',
  'Certified professional with hundreds of happy clients.',
  'Honest pricing, clean work, and on-time every time.',
];

const CENTER = { lat: 6.5244, lng: 3.3792 }; // Lagos

function jitter(km: number) {
  const r = km / 111;
  const u = Math.random();
  const v = Math.random();
  const w = r * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  return {
    lat: CENTER.lat + w * Math.cos(t),
    lng: CENTER.lng + (w * Math.sin(t)) / Math.cos((CENTER.lat * Math.PI) / 180),
  };
}

export function buildSeed(): DB {
  const users: User[] = [];
  const artisans: Artisan[] = [];

  // Admin
  users.push({
    id: 'admin', phone: '+10000000000', role: 'admin', fullName: 'Operations Admin',
    avatarColor: '#0F172A', status: 'active', createdAt: new Date().toISOString(),
  });

  // Demo customer
  users.push({
    id: 'cust-demo', phone: '+2348010000001', role: 'customer', fullName: 'Demo Customer',
    avatarColor: '#2563EB', status: 'active', createdAt: new Date().toISOString(),
  });

  NAMES.forEach((name, i) => {
    const loc = jitter(8);
    const cat1 = CATEGORIES[i % CATEGORIES.length]!.slug;
    const cat2 = CATEGORIES[(i + 3) % CATEGORIES.length]!.slug;
    const id = `art-${i + 1}`;
    users.push({
      id, phone: `+23480200000${(10 + i).toString()}`, role: 'artisan', fullName: name,
      avatarColor: COLORS[i % COLORS.length]!, status: 'active', createdAt: new Date().toISOString(),
    });
    artisans.push({
      id,
      fullName: name,
      avatarColor: COLORS[i % COLORS.length]!,
      bio: BIOS[i % BIOS.length]!,
      categorySlugs: i % 2 === 0 ? [cat1, cat2] : [cat1],
      yearsExperience: 3 + (i % 12),
      baseRate: 2000 + i * 250,
      hourlyRate: 1500 + i * 150,
      available: i % 3 !== 0,
      verified: i % 5 !== 0,
      rating: Math.round((3.6 + Math.random() * 1.4) * 10) / 10,
      ratingCount: 4 + i * 3,
      completedJobs: 8 + i * 5,
      lat: loc.lat,
      lng: loc.lng,
      phone: `+23480200000${(10 + i).toString()}`,
      portfolio: [COLORS[i % COLORS.length]!, COLORS[(i + 2) % COLORS.length]!, COLORS[(i + 4) % COLORS.length]!],
    });
  });

  return {
    users,
    artisans,
    categories: CATEGORIES,
    bookings: [],
    messages: [],
    reviews: [
      { id: 'r1', bookingId: 'seed', artisanId: 'art-1', reviewerId: 'cust-demo', reviewerName: 'Demo Customer', rating: 5, comment: 'Fixed my leak in 30 minutes. Excellent!', createdAt: new Date().toISOString() },
      { id: 'r2', bookingId: 'seed', artisanId: 'art-1', reviewerId: 'cust-demo', reviewerName: 'Kemi A.', rating: 4, comment: 'Good work, fair price.', createdAt: new Date().toISOString() },
    ],
    favorites: [],
    reports: [],
  };
}

export const SEED_CENTER = CENTER;
