import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { useAuth } from '../src/lib/store';
import { api, getAccessToken } from '../src/lib/api';

SplashScreen.preventAutoHideAsync().catch(() => {});

function useAuthBootstrap() {
  const setUser = useAuth((s) => s.setUser);
  const setLoading = useAuth((s) => s.setLoading);
  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (!token) {
        setUser(null);
        setLoading(false);
        SplashScreen.hideAsync().catch(() => {});
        return;
      }
      try {
        const me = await api<{
          id: string;
          phone: string;
          role: 'CUSTOMER' | 'ARTISAN' | 'ADMIN';
          fullName: string | null;
          avatarUrl: string | null;
        }>('/v1/me');
        setUser(me);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
        SplashScreen.hideAsync().catch(() => {});
      }
    })();
  }, [setUser, setLoading]);
}

function useAuthRouting() {
  const router = useRouter();
  const segments = useSegments();
  const { user, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) router.replace('/(auth)/phone');
    else if (user && inAuth) {
      router.replace(user.role === 'ARTISAN' ? '/(artisan)/' : '/(customer)/');
    }
  }, [user, loading, segments, router]);
}

export default function RootLayout() {
  useAuthBootstrap();
  useAuthRouting();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
