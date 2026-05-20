import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { api } from '../../../src/lib/api';
import { useLocation } from '../../../src/lib/store';
import { Button } from '../../../src/components/Button';
import { useTheme } from '../../../src/theme/tokens';

export default function NewBooking() {
  const t = useTheme();
  const router = useRouter();
  const { artisanId } = useLocalSearchParams<{ artisanId: string }>();
  const { lat, lng } = useLocation();
  const [description, setDescription] = useState('');
  const [addressText, setAddressText] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!lat || !lng) {
      setErr('Location not available. Enable location and retry.');
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      // For MVP we use the artisan's first category. A real impl would let the
      // customer pick a category from a drop-down before submitting.
      const detail = await api<{ profile: { categories: { category: { id: string } }[] } }>(
        `/v1/artisans/${artisanId}`,
      );
      const categoryId = detail.profile.categories[0]?.category.id;
      if (!categoryId) throw new Error('Artisan has no categories');

      const booking = await api<{ id: string }>('/v1/bookings', {
        method: 'POST',
        body: {
          artisanId,
          categoryId,
          description,
          addressText,
          addressLat: lat,
          addressLng: lng,
          isEmergency: false,
        },
      });
      router.replace({ pathname: '/(customer)/booking/[id]', params: { id: booking.id } });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ padding: t.spacing(4), gap: 16 }}>
        <Text style={{ color: t.text, fontSize: t.fontSizes.xl, fontWeight: '700' }}>
          Describe your job
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          placeholder="e.g. Leaking pipe under kitchen sink"
          placeholderTextColor={t.textMuted}
          style={{
            borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, color: t.text,
            padding: 14, borderRadius: t.radii.md, minHeight: 110, textAlignVertical: 'top',
          }}
        />
        <TextInput
          value={addressText}
          onChangeText={setAddressText}
          placeholder="Address (street, area)"
          placeholderTextColor={t.textMuted}
          style={{
            borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, color: t.text,
            padding: 14, borderRadius: t.radii.md,
          }}
        />
        {err && <Text style={{ color: t.danger }}>{err}</Text>}
        <Button title="Request booking" onPress={submit} loading={loading} />
      </View>
    </SafeAreaView>
  );
}
