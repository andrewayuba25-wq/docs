import { useEffect, useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { api } from '../../../src/lib/api';
import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { useTheme } from '../../../src/theme/tokens';

type Booking = {
  id: string;
  status: string;
  description: string;
  addressText: string;
  addressLat: number;
  addressLng: number;
  customer: { fullName: string | null; phone: string };
  category: { name: string };
};

export default function ArtisanJob() {
  const t = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [b, setB] = useState<Booking | null>(null);

  function load() {
    api<Booking>(`/v1/bookings/${id}`).then(setB).catch(() => {});
  }
  useEffect(load, [id]);

  async function transition(path: string) {
    await api(`/v1/bookings/${id}/${path}`, { method: 'POST', body: {} });
    load();
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
          <Text style={{ color: t.textMuted }}>Customer</Text>
          <Text style={{ color: t.text, fontWeight: '700' }}>{b.customer.fullName}</Text>
          <Text style={{ color: t.textMuted }}>{b.customer.phone}</Text>
        </Card>
        <Card padded>
          <Text style={{ color: t.textMuted }}>Job</Text>
          <Text style={{ color: t.text }}>{b.description}</Text>
          <Text style={{ color: t.textMuted, marginTop: 8 }}>{b.addressText}</Text>
        </Card>
        <Card padded>
          <Text style={{ color: t.textMuted }}>Status</Text>
          <Text style={{ color: t.primary, fontWeight: '700', fontSize: t.fontSizes.lg }}>{b.status}</Text>
        </Card>

        <Button
          title="Open in Maps"
          variant="secondary"
          onPress={() =>
            Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${b.addressLat},${b.addressLng}`)
          }
        />

        {b.status === 'REQUESTED' && (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button title="Reject" variant="danger" style={{ flex: 1 }} onPress={() => transition('reject')} />
            <Button title="Accept" style={{ flex: 2 }} onPress={() => transition('accept')} />
          </View>
        )}
        {b.status === 'ACCEPTED' && <Button title="I'm en route" onPress={() => transition('start')} />}
        {b.status === 'EN_ROUTE' && <Button title="Start working" onPress={() => transition('in-progress')} />}
        {b.status === 'IN_PROGRESS' && <Button title="Mark complete" onPress={() => transition('complete')} />}

        <Button
          title="Chat with customer"
          variant="secondary"
          onPress={() => router.push({ pathname: '/(customer)/chat/[id]', params: { id: b.id } })}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
