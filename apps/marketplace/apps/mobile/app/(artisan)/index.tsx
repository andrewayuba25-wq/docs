import { useEffect, useState } from 'react';
import { FlatList, Pressable, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';

import { api } from '../../src/lib/api';
import { useAuth } from '../../src/lib/store';
import { Card } from '../../src/components/Card';
import { useTheme } from '../../src/theme/tokens';

type Booking = {
  id: string;
  status: string;
  description: string;
  customer: { fullName: string | null };
  category: { name: string };
  isEmergency: boolean;
};

export default function ArtisanHome() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [available, setAvailable] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);

  async function load() {
    const me = await api<{ artisan?: { available: boolean } }>('/v1/me');
    setAvailable(Boolean(me.artisan?.available));
    const { bookings } = await api<{ bookings: Booking[] }>('/v1/bookings', { query: { role: 'artisan' } });
    setBookings(bookings);
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  async function toggle(v: boolean) {
    setAvailable(v);
    const { status } = await Location.requestForegroundPermissionsAsync();
    let lat: number | undefined; let lng: number | undefined;
    if (v && status === 'granted') {
      const pos = await Location.getCurrentPositionAsync({});
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    }
    await api('/v1/me/artisan/availability', { method: 'PATCH', body: { available: v, lat, lng } });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ padding: t.spacing(4), gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: t.textMuted }}>Welcome,</Text>
            <Text style={{ color: t.text, fontSize: t.fontSizes.xl, fontWeight: '700' }}>
              {user?.fullName ?? 'Pro'}
            </Text>
          </View>
          <Pressable onPress={() => router.push('/(artisan)/profile')} hitSlop={10}>
            <Ionicons name="person-circle" size={36} color={t.primary} />
          </Pressable>
        </View>

        <Card padded style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 12, height: 12, borderRadius: 6,
              backgroundColor: available ? t.success : t.textMuted,
            }}
          />
          <Text style={{ color: t.text, fontWeight: '700', flex: 1 }}>
            {available ? 'You are available' : 'You are offline'}
          </Text>
          <Switch value={available} onValueChange={toggle} />
        </Card>

        <Text style={{ color: t.text, fontWeight: '700', fontSize: t.fontSizes.lg }}>
          Incoming requests
        </Text>
      </View>

      <FlatList
        data={bookings}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ paddingHorizontal: t.spacing(4), gap: 12, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Card padded onPress={() => router.push({ pathname: '/(artisan)/job/[id]', params: { id: item.id } })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {item.isEmergency && <Ionicons name="alert-circle" size={16} color={t.danger} />}
              <Text style={{ color: t.text, fontWeight: '700' }}>
                {item.customer.fullName ?? 'Customer'}
              </Text>
              <View style={{ flex: 1 }} />
              <Text style={{ color: t.primary, fontWeight: '600' }}>{item.status}</Text>
            </View>
            <Text style={{ color: t.textMuted, marginTop: 4 }}>{item.category.name}</Text>
            <Text style={{ color: t.text, marginTop: 8 }} numberOfLines={2}>
              {item.description}
            </Text>
          </Card>
        )}
        ListEmptyComponent={
          <Text style={{ color: t.textMuted, textAlign: 'center', marginTop: 40, paddingHorizontal: 16 }}>
            No requests yet. Stay available to get matched.
          </Text>
        }
      />
    </SafeAreaView>
  );
}
