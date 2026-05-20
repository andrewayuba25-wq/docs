import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { api } from '../../../src/lib/api';
import { connectSocket } from '../../../src/lib/socket';
import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { useTheme } from '../../../src/theme/tokens';

type Booking = {
  id: string;
  status: string;
  description: string;
  addressText: string;
  priceCents: number | null;
  customer: { id: string; fullName: string | null };
  artisan: { user: { id: string; fullName: string | null; phone: string } };
  category: { name: string };
};

export default function BookingDetail() {
  const t = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [b, setB] = useState<Booking | null>(null);

  useEffect(() => {
    api<Booking>(`/v1/bookings/${id}`).then(setB).catch(() => {});
    (async () => {
      const s = await connectSocket();
      const onStatus = (updated: Booking) => {
        if (updated.id === id) setB(updated);
      };
      s.on('booking:status', onStatus);
      return () => {
        s.off('booking:status', onStatus);
      };
    })();
  }, [id]);

  async function cancel() {
    await api(`/v1/bookings/${id}/cancel`, { method: 'POST', body: { reason: 'Customer cancelled' } });
    router.back();
  }

  if (!b) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
        <Text style={{ color: t.textMuted, padding: 20 }}>Loading…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: t.spacing(4), gap: 16 }}>
        <Card padded>
          <Text style={{ color: t.textMuted }}>Status</Text>
          <Text style={{ color: t.primary, fontWeight: '700', fontSize: t.fontSizes.lg }}>
            {b.status}
          </Text>
        </Card>
        <Card padded>
          <Text style={{ color: t.textMuted }}>Artisan</Text>
          <Text style={{ color: t.text, fontWeight: '700' }}>{b.artisan.user.fullName}</Text>
          <Text style={{ color: t.textMuted }}>{b.category.name}</Text>
        </Card>
        <Card padded>
          <Text style={{ color: t.textMuted }}>Job</Text>
          <Text style={{ color: t.text }}>{b.description}</Text>
          <Text style={{ color: t.textMuted, marginTop: 8 }}>{b.addressText}</Text>
          {b.priceCents != null && (
            <Text style={{ color: t.text, fontWeight: '700', marginTop: 8 }}>
              Estimate: ₦{(b.priceCents / 100).toLocaleString()}
            </Text>
          )}
        </Card>

        <Button
          title="Open chat"
          variant="secondary"
          onPress={() => router.push({ pathname: '/(customer)/chat/[id]', params: { id: b.id } })}
        />
        {['REQUESTED', 'ACCEPTED', 'EN_ROUTE'].includes(b.status) && (
          <Button title="Cancel booking" variant="danger" onPress={cancel} />
        )}
        {b.status === 'COMPLETED' && (
          <Button
            title="Leave a review"
            onPress={() => router.push({ pathname: '/(customer)/booking/review', params: { id: b.id } })}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
