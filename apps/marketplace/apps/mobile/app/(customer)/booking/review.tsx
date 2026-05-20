import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { api } from '../../../src/lib/api';
import { Button } from '../../../src/components/Button';
import { useTheme } from '../../../src/theme/tokens';

export default function ReviewScreen() {
  const t = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      await api(`/v1/bookings/${id}/review`, { method: 'POST', body: { rating, comment } });
      router.back();
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ padding: t.spacing(4), gap: 16 }}>
        <Text style={{ color: t.text, fontSize: t.fontSizes.xl, fontWeight: '700' }}>
          How was the service?
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setRating(n)} hitSlop={6}>
              <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={36} color={t.warning} />
            </Pressable>
          ))}
        </View>
        <TextInput
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={4}
          placeholder="Share your experience (optional)"
          placeholderTextColor={t.textMuted}
          style={{
            borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, color: t.text,
            padding: 14, borderRadius: t.radii.md, minHeight: 110, textAlignVertical: 'top',
          }}
        />
        <Button title="Submit review" onPress={submit} loading={loading} />
      </View>
    </SafeAreaView>
  );
}
