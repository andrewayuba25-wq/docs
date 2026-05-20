import { z } from 'zod';

export const Role = z.enum(['CUSTOMER', 'ARTISAN', 'ADMIN']);
export type Role = z.infer<typeof Role>;

export const BookingStatus = z.enum([
  'REQUESTED', 'ACCEPTED', 'REJECTED',
  'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED',
]);
export type BookingStatus = z.infer<typeof BookingStatus>;

export const DocKind = z.enum(['ID_FRONT', 'ID_BACK', 'SELFIE', 'TRADE_LICENSE']);

const phone = z.string().regex(/^\+\d{6,15}$/, 'Phone must be E.164 format (e.g. +2348012345678).');

export const OtpRequest = z.object({ phone });
export const OtpVerify = z.object({ phone, code: z.string().length(6) });
export const RefreshTokenReq = z.object({ refreshToken: z.string().min(10) });

export const SetRoleReq = z.object({ role: z.enum(['CUSTOMER', 'ARTISAN']) });

export const UpdateMeReq = z.object({
  fullName: z.string().min(1).max(80).optional(),
  avatarUrl: z.string().url().optional(),
  email: z.string().email().optional(),
});

export const ArtisanOnboardingReq = z.object({
  bio: z.string().max(500).optional(),
  yearsExperience: z.number().int().min(0).max(70),
  baseRateCents: z.number().int().min(0),
  hourlyRateCents: z.number().int().min(0),
  categoryIds: z.array(z.string()).min(1).max(5),
});

export const AvailabilityReq = z.object({
  available: z.boolean(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export const SearchArtisansReq = z.object({
  category: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(0.1).max(50).default(10),
  minRating: z.coerce.number().min(0).max(5).optional(),
  maxPriceCents: z.coerce.number().int().min(0).optional(),
  availableNow: z.coerce.boolean().optional(),
  sort: z.enum(['distance', 'rating', 'price']).default('distance'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

export const CreateBookingReq = z.object({
  artisanId: z.string(),
  categoryId: z.string(),
  description: z.string().min(5).max(2000),
  addressText: z.string().min(3).max(300),
  addressLat: z.number().min(-90).max(90),
  addressLng: z.number().min(-180).max(180),
  scheduledFor: z.string().datetime().optional(),
  isEmergency: z.boolean().default(false),
});

export const RejectBookingReq = z.object({
  reason: z.string().min(1).max(300),
});

export const CancelBookingReq = z.object({
  reason: z.string().min(1).max(300),
});

export const ReviewReq = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export const SendMessageReq = z.object({
  body: z.string().min(1).max(2000),
  kind: z.enum(['TEXT', 'IMAGE', 'LOCATION']).default('TEXT'),
  s3Key: z.string().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export const RegisterPushTokenReq = z.object({
  token: z.string().min(10),
  platform: z.enum(['ios', 'android', 'web']),
});

export const ReportReq = z.object({
  reportedId: z.string(),
  bookingId: z.string().optional(),
  reason: z.string().min(3).max(120),
  details: z.string().max(2000).optional(),
});

export type ArtisanSearchResult = {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  avgRating: number;
  ratingCount: number;
  completedJobs: number;
  baseRateCents: number;
  hourlyRateCents: number;
  available: boolean;
  verified: boolean;
  distanceKm: number;
  currentLat: number | null;
  currentLng: number | null;
  categories: { id: string; slug: string; name: string }[];
};
