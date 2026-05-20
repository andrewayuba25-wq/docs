import { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';

import { api } from '../../src/lib/api';
import { useAuth, useLocation as useLocStore } from '../../src/lib/store';
import { Card } from '../../src/components/Card';
import { useTheme } from '../../src/theme/tokens';

type Category = { id: string; slug: string; name: string; iconKey: string | null };

export default function CustomerHome() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { lat, lng, set } = useLocStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [locStatus, setLocStatus] = useState<string>('Requesting location…');

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocStatus('Location permission denied');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      set(pos.coords.latitude, pos.coords.longitude);
      setLocStatus('');
    })();
  }, [set]);

  useEffect(() => {
    api<Category[]>('/v1/categories').then(setCategories).catch(() => {});
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: t.spacing(4), gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: t.textMuted, fontSize: t.fontSizes.sm }}>Hello,</Text>
            <Text style={{ color: t.text, fontSize: t.fontSizes.xl, fontWeight: '700' }}>
              {user?.fullName ?? 'there'} 👋
            </Text>
          </View>
          <Pressable onPress={() => router.push('/(customer)/profile')} hitSlop={10}>
            <Ionicons name="person-circle" size={36} color={t.primary} />
          </Pressable>
        </View>

        <Card padded style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="location" size={20} color={t.primary} />
          <Text style={{ color: t.text, flex: 1 }}>
            {lat && lng ? `Near you (${lat.toFixed(3)}, ${lng.toFixed(3)})` : locStatus}
          </Text>
        </Card>

        <Pressable
          onPress={() => router.push('/(customer)/search?emergency=1')}
          style={{
            backgroundColor: t.danger,
            padding: 16,
            borderRadius: t.radii.lg,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Ionicons name="alert-circle" size={24} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: t.fontSizes.md }}>
              Emergency service
            </Text>
            <Text style={{ color: '#fff', opacity: 0.85, fontSize: t.fontSizes.sm }}>
              Reach the nearest available artisan now
            </Text>
          </View>
        </Pressable>

        <Text style={{ color: t.text, fontSize: t.fontSizes.lg, fontWeight: '700', marginTop: 8 }}>
          Categories
        </Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ gap: 12 }}
          renderItem={({ item }) => (
            <Link
              href={{ pathname: '/(customer)/search', params: { category: item.slug } }}
              asChild
            >
              <Pressable>
                <Card padded style={{ width: 110, alignItems: 'center', gap: 8 }}>
                  <View style={{
                    width: 44, height: 44, borderRadius: 22, backgroundColor: t.primary + '22',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Ionicons name="construct" size={22} color={t.primary} />
                  </View>
                  <Text style={{ color: t.text, fontWeight: '600', textAlign: 'center' }}>{item.name}</Text>
                </Card>
              </Pressable>
            </Link>
          )}
        />

        <Text style={{ color: t.text, fontSize: t.fontSizes.lg, fontWeight: '700', marginTop: 8 }}>
          Quick actions
        </Text>
        <Card padded onPress={() => router.push('/(customer)/bookings')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="calendar" size={24} color={t.primary} />
            <Text style={{ color: t.text, fontWeight: '600', flex: 1 }}>My bookings</Text>
            <Ionicons name="chevron-forward" size={20} color={t.textMuted} />
          </View>
        </Card>
        <Card padded onPress={() => router.push('/(customer)/favorites')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="heart" size={24} color={t.danger} />
            <Text style={{ color: t.text, fontWeight: '600', flex: 1 }}>Favorites</Text>
            <Ionicons name="chevron-forward" size={20} color={t.textMuted} />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
