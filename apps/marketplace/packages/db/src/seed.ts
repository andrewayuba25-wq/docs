import { PrismaClient, Role, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIES = [
  { slug: 'plumber', name: 'Plumber', iconKey: 'plumber' },
  { slug: 'electrician', name: 'Electrician', iconKey: 'electrician' },
  { slug: 'carpenter', name: 'Carpenter', iconKey: 'carpenter' },
  { slug: 'painter', name: 'Painter', iconKey: 'painter' },
  { slug: 'mechanic', name: 'Mechanic', iconKey: 'mechanic' },
  { slug: 'cleaner', name: 'Cleaner', iconKey: 'cleaner' },
  { slug: 'ac-tech', name: 'AC Technician', iconKey: 'ac' },
  { slug: 'mason', name: 'Mason', iconKey: 'mason' },
];

const SAMPLE_NAMES = [
  'Adewale Okafor', 'Ngozi Eze', 'Tunde Bello', 'Aisha Bakare', 'Chinedu Obi',
  'Fatima Yusuf', 'Emeka Nwosu', 'Bisi Adeyemi', 'Ibrahim Sani', 'Funke Lawal',
  'Kunle Ojo', 'Halima Garba', 'Segun Adebayo', 'Amaka Onyeka', 'Yusuf Mohammed',
  'Chioma Igwe', 'Olumide Fashola', 'Zainab Aliyu', 'Tobi Akande', 'Sade Ogunyemi',
];

// Lagos centroid; jitter generates points within ~5km.
const SEED_CENTER = { lat: 6.5244, lng: 3.3792 };

function jitter(center: { lat: number; lng: number }, km: number) {
  const r = km / 111;
  const u = Math.random();
  const v = Math.random();
  const w = r * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  return {
    lat: center.lat + w * Math.cos(t),
    lng: center.lng + (w * Math.sin(t)) / Math.cos((center.lat * Math.PI) / 180),
  };
}

async function main() {
  console.log('Seeding database…');

  // Categories
  for (const c of CATEGORIES) {
    await prisma.serviceCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name, iconKey: c.iconKey },
      create: c,
    });
  }
  const categories = await prisma.serviceCategory.findMany();

  // Admin
  await prisma.user.upsert({
    where: { phone: '+10000000000' },
    update: {},
    create: {
      phone: '+10000000000',
      email: 'admin@artisanapp.local',
      // bcrypt hash of "admin123" (dev only — rotate in real env).
      passwordHash: '$2a$10$CwTycUXWue0Thq9StjUM0uJ8.0d5dQRn6XzaCs.G6f.D3lQQQy5Xq',
      role: Role.ADMIN,
      fullName: 'Demo Admin',
      status: UserStatus.ACTIVE,
      phoneVerifiedAt: new Date(),
    },
  });

  // Demo customer
  await prisma.user.upsert({
    where: { phone: '+10000000001' },
    update: {},
    create: {
      phone: '+10000000001',
      role: Role.CUSTOMER,
      fullName: 'Demo Customer',
      status: UserStatus.ACTIVE,
      phoneVerifiedAt: new Date(),
      customer: {
        create: { homeLat: SEED_CENTER.lat, homeLng: SEED_CENTER.lng, homeAddr: 'Lagos, Nigeria' },
      },
    },
  });

  // Artisans
  for (let i = 0; i < SAMPLE_NAMES.length; i++) {
    const name = SAMPLE_NAMES[i]!;
    const phone = `+1000000${(2000 + i).toString().padStart(4, '0')}`;
    const loc = jitter(SEED_CENTER, 5);
    const cats = [categories[i % categories.length]!, categories[(i + 1) % categories.length]!];

    const user = await prisma.user.upsert({
      where: { phone },
      update: {},
      create: {
        phone,
        role: Role.ARTISAN,
        fullName: name,
        status: UserStatus.ACTIVE,
        phoneVerifiedAt: new Date(),
        artisan: {
          create: {
            bio: `Experienced ${cats[0]!.name.toLowerCase()} with ${5 + (i % 10)} years on the job.`,
            yearsExperience: 5 + (i % 10),
            baseRateCents: 200000 + i * 5000,
            hourlyRateCents: 500000 + i * 10000,
            available: i % 3 !== 0,
            currentLat: loc.lat,
            currentLng: loc.lng,
            avgRating: 3.8 + Math.random() * 1.2,
            ratingCount: 5 + i * 3,
            completedJobs: 10 + i * 4,
            verifiedAt: i % 4 === 0 ? null : new Date(),
          },
        },
      },
      include: { artisan: true },
    });

    if (user.artisan) {
      for (const c of cats) {
        await prisma.artisanCategory.upsert({
          where: { artisanId_categoryId: { artisanId: user.id, categoryId: c.id } },
          update: {},
          create: { artisanId: user.id, categoryId: c.id },
        });
      }
    }
  }

  console.log(
    `Seed complete: ${CATEGORIES.length} categories, ${SAMPLE_NAMES.length} artisans, 1 customer, 1 admin.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
