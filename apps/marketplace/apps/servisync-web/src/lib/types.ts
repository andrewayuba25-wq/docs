export type Role = 'customer' | 'artisan' | 'admin';

export type UserStatus = 'active' | 'suspended' | 'pending';

export type BookingStatus =
  | 'requested'
  | 'accepted'
  | 'rejected'
  | 'en_route'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface User {
  id: string;
  phone: string;
  role: Role;
  fullName: string;
  avatarColor: string;
  status: UserStatus;
  createdAt: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  icon: string; // emoji for zero-dependency icons
  active: boolean;
}

export interface Artisan {
  id: string; // === userId
  fullName: string;
  avatarColor: string;
  bio: string;
  categorySlugs: string[];
  yearsExperience: number;
  baseRate: number; // in major currency units
  hourlyRate: number;
  available: boolean;
  verified: boolean;
  rating: number;
  ratingCount: number;
  completedJobs: number;
  lat: number;
  lng: number;
  phone: string;
  portfolio: string[]; // emoji/colors as placeholder thumbnails
}

export interface Booking {
  id: string;
  customerId: string;
  artisanId: string;
  categorySlug: string;
  status: BookingStatus;
  description: string;
  addressText: string;
  price: number;
  isEmergency: boolean;
  createdAt: string;
  updatedAt: string;
  scheduledFor?: string;
}

export interface ChatMessage {
  id: string;
  bookingId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  artisanId: string;
  reviewerId: string;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedId: string;
  reason: string;
  status: 'open' | 'resolved';
  createdAt: string;
}

export interface DB {
  users: User[];
  artisans: Artisan[];
  categories: Category[];
  bookings: Booking[];
  messages: ChatMessage[];
  reviews: Review[];
  favorites: { userId: string; artisanId: string }[];
  reports: Report[];
}
