import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { api } from '../../src/lib/api';
import { useLocation } from '../../src/lib/store';
import { Avatar } from '../../src/components/Avatar';
import { Card } from '../../src/components/Card';
import { Rating } from '../../src/components/Rating';
import { useTheme } from '../../src/theme/tokens';
import type { ArtisanSearchResult } from '@artisan/shared';
import { formatDistance } from '@artisan/shared';

export default function Search() {
  const t = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string; emergency?: string }>();
  const { lat, lng } = useLocation();
  const [results, setResults] = useState<ArtisanSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<'distance' | 'rating' | 'price'>('distance');

  useEffect(() => {
    if (lat == null || lng == null) return;
    setLoading(true);
    api<{ results: ArtisanSearchResult[] }>('/v1/artisans/search', {
      query: { lat, lng, radiusKm: 10, sort, ...(params.category ? { category: params.category } : {}), availableNow: params.emergency ? true : undefined },
    })
      .then(({ results }) => setResults(results))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [lat, lng, sort, params.category, params.emergency]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ paddingHorizontal: t.spacing(4), paddingTop: t.spacing(2), gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-back" size={24} color={t.text} />
          </Pressable>
          <Text style={{ color: t.text, fontSize: t.fontSizes.xl, fontWeight: '700' }}>
            {params.emergency ? 'Emergency' : params.category ?? 'Nearby artisans'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['distance', 'rating', 'price'] as const).map((s) => (
            <Pressable
              key={s}
              onPress={() => setSort(s)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: t.radii.pill,
                backgroundColor: sort === s ? t.primary : t.surfaceAlt,
              }}
            >
              <Text style={{ color: sort === s ? '#fff' : t.text, fontWeight: '600', textTransform: 'capitalize' }}>
                {s}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator color={t.primary} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: t.spacing(4), gap: 12 }}
          renderItem={({ item }) => (
            <Card padded onPress={() => router.push({ pathname: '/(customer)/artisan/[id]', params: { id: item.id } })}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Avatar uri={item.avatarUrl} name={item.fullName} size={56} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ color: t.text, fontWeight: '700', fontSize: t.fontSizes.md }}>
                      {item.fullName}
                    </Text>
                    {item.verified && <Ionicons name="shield-checkmark" size={14} color={t.success} />}
                  </View>
                  <Text style={{ color: t.textMuted, fontSize: t.fontSizes.sm, marginTop: 2 }}>
                    {item.categories.map((c) => c.name).join(' • ')}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 }}>
                    <Rating value={item.avgRating} count={item.ratingCount} />
                    <Text style={{ color: t.textMuted }}>{formatDistance(item.distanceKm)}</Text>
                    <Text style={{ color: t.text, fontWeight: '600' }}>
                      ₦{(item.baseRateCents / 100).toLocaleString()} base
                    </Text>
                  </View>
                </View>
                {item.available && (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.success, marginTop: 4 }} />
                )}
              </View>
            </Card>
          )}
          ListEmptyComponent={() => (
            <Text style={{ color: t.textMuted, textAlign: 'center', marginTop: 40 }}>
              No artisans match these filters yet.
            </Text>
          )}
        />
      )}
    </SafeAreaView>
  );
}
