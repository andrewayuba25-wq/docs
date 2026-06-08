import { useEffect, useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { api } from '../../../src/lib/api';
import { Avatar } from '../../../src/components/Avatar';
import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { Rating } from '../../../src/components/Rating';
import { useTheme } from '../../../src/theme/tokens';

type Detail = {
  profile: {
    userId: string;
    bio: string | null;
    yearsExperience: number;
    baseRateCents: number;
    hourlyRateCents: number;
    avgRating: number;
    ratingCount: number;
    verifiedAt: string | null;
    user: { id: string; fullName: string | null; phone: string; avatarUrl: string | null };
    categories: { category: { id: string; name: string; slug: string } }[];
  };
  recentReviews: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    reviewer: { fullName: string | null; avatarUrl: string | null };
  }[];
};

export default function ArtisanDetail() {
  const t = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<Detail | null>(null);

  useEffect(() => {
    api<Detail>(`/v1/artisans/${id}`).then(setData).catch(() => {});
  }, [id]);

  if (!data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
        <Text style={{ color: t.textMuted, padding: 20 }}>Loading…</Text>
      </SafeAreaView>
    );
  }

  const p = data.profile;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: t.spacing(4), gap: 16 }}>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Avatar uri={p.user.avatarUrl} name={p.user.fullName} size={96} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: t.text, fontSize: t.fontSizes.xl, fontWeight: '700' }}>
              {p.user.fullName}
            </Text>
            {p.verifiedAt && <Ionicons name="shield-checkmark" size={18} color={t.success} />}
          </View>
          <Rating value={p.avgRating} count={p.ratingCount} size={16} />
          <Text style={{ color: t.textMuted }}>
            {p.categories.map((c) => c.category.name).join(' • ')} • {p.yearsExperience}y exp.
          </Text>
        </View>

        <Card padded>
          <Text style={{ color: t.text, fontWeight: '700', marginBottom: 8 }}>About</Text>
          <Text style={{ color: t.textMuted, lineHeight: 22 }}>
            {p.bio ?? 'No bio yet.'}
          </Text>
        </Card>

        <Card padded>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: t.textMuted, fontSize: t.fontSizes.sm }}>Base price</Text>
              <Text style={{ color: t.text, fontWeight: '700', fontSize: t.fontSizes.lg }}>
                ₦{(p.baseRateCents / 100).toLocaleString()}
              </Text>
            </View>
            <View>
              <Text style={{ color: t.textMuted, fontSize: t.fontSizes.sm }}>Hourly</Text>
              <Text style={{ color: t.text, fontWeight: '700', fontSize: t.fontSizes.lg }}>
                ₦{(p.hourlyRateCents / 100).toLocaleString()}
              </Text>
            </View>
          </View>
        </Card>

        <Text style={{ color: t.text, fontWeight: '700', fontSize: t.fontSizes.lg }}>
          Recent reviews
        </Text>
        {data.recentReviews.length === 0 ? (
          <Text style={{ color: t.textMuted }}>No reviews yet.</Text>
        ) : (
          data.recentReviews.map((r) => (
            <Card key={r.id} padded>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Avatar uri={r.reviewer.avatarUrl} name={r.reviewer.fullName} size={32} />
                <Text style={{ color: t.text, fontWeight: '600' }}>
                  {r.reviewer.fullName ?? 'Anonymous'}
                </Text>
                <View style={{ flex: 1 }} />
                <Rating value={r.rating} />
              </View>
              {r.comment && <Text style={{ color: t.textMuted, marginTop: 8 }}>{r.comment}</Text>}
            </Card>
          ))
        )}

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
          <Button
            title="Call"
            variant="secondary"
            style={{ flex: 1 }}
            onPress={() => Linking.openURL(`tel:${p.user.phone}`)}
          />
          <Button
            title="Book"
            style={{ flex: 2 }}
            onPress={() => router.push({ pathname: '/(customer)/booking/new', params: { artisanId: p.userId } })}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
