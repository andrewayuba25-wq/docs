import { useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { api } from '../../src/lib/api';
import { Card } from '../../src/components/Card';
import { useTheme } from '../../src/theme/tokens';

type Booking = {
  id: string;
  status: string;
  description: string;
  artisan: { user: { fullName: string | null } };
  category: { name: string };
  createdAt: string;
};

export default function Bookings() {
  const t = useTheme();
  const router = useRouter();
  const [items, setItems] = useState<Booking[]>([]);

  useEffect(() => {
    api<{ bookings: Booking[] }>('/v1/bookings', { query: { role: 'customer' } })
      .then(({ bookings }) => setItems(bookings))
      .catch(() => {});
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ padding: t.spacing(4) }}>
        <Text style={{ color: t.text, fontSize: t.fontSizes.xl, fontWeight: '700' }}>My bookings</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ paddingHorizontal: t.spacing(4), gap: 12 }}
        renderItem={({ item }) => (
          <Card padded onPress={() => router.push({ pathname: '/(customer)/booking/[id]', params: { id: item.id } })}>
            <Text style={{ color: t.text, fontWeight: '700' }}>{item.artisan.user.fullName}</Text>
            <Text style={{ color: t.textMuted, marginTop: 2 }}>{item.category.name}</Text>
            <Text style={{ color: t.text, marginTop: 8 }} numberOfLines={2}>
              {item.description}
            </Text>
            <Text style={{ color: t.primary, marginTop: 8, fontWeight: '600' }}>{item.status}</Text>
          </Card>
        )}
        ListEmptyComponent={
          <Text style={{ color: t.textMuted, textAlign: 'center', marginTop: 40 }}>
            No bookings yet.
          </Text>
        }
      />
    </SafeAreaView>
  );
}
