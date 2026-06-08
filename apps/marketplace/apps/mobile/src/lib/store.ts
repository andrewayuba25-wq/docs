import { create } from 'zustand';

type User = {
  id: string;
  phone: string;
  role: 'CUSTOMER' | 'ARTISAN' | 'ADMIN';
  fullName: string | null;
  avatarUrl: string | null;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  setUser: (u: User | null) => void;
  setLoading: (b: boolean) => void;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
}));

type LocationState = {
  lat: number | null;
  lng: number | null;
  set: (lat: number, lng: number) => void;
};

export const useLocation = create<LocationState>((set) => ({
  lat: null,
  lng: null,
  set: (lat, lng) => set({ lat, lng }),
}));
