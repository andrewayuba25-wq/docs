import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/lib/api';
import { Card } from '../../src/components/Card';
import { useTheme } from '../../src/theme/tokens';

type Booking = { id: string; status: string; priceCents: number | null; completedAt: string | null };

export default function Earnings() {
  const t = useTheme();
  const [completed, setCompleted] = useState<Booking[]>([]);

  useEffect(() => {
    api<{ bookings: Booking[] }>('/v1/bookings', { query: { role: 'artisan', status: 'COMPLETED' } })
      .then(({ bookings }) => setCompleted(bookings))
      .catch(() => {});
  }, []);

  const total = completed.reduce((sum, b) => sum + (b.priceCents ?? 0), 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: t.spacing(4), gap: 16 }}>
        <Text style={{ color: t.text, fontSize: t.fontSizes.xl, fontWeight: '700' }}>Earnings</Text>
        <Card padded>
          <Text style={{ color: t.textMuted }}>Lifetime gross</Text>
          <Text style={{ color: t.text, fontWeight: '700', fontSize: t.fontSizes.xxl }}>
            ₦{(total / 100).toLocaleString()}
          </Text>
          <Text style={{ color: t.textMuted, marginTop: 4 }}>
            {completed.length} completed job{completed.length === 1 ? '' : 's'}
          </Text>
        </Card>
        {completed.map((b) => (
          <Card key={b.id} padded>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: t.text }}>Job #{b.id.slice(-6)}</Text>
              <Text style={{ color: t.text, fontWeight: '700' }}>
                ₦{((b.priceCents ?? 0) / 100).toLocaleString()}
              </Text>
            </View>
            {b.completedAt && (
              <Text style={{ color: t.textMuted, marginTop: 2 }}>
                {new Date(b.completedAt).toLocaleDateString()}
              </Text>
            )}
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
