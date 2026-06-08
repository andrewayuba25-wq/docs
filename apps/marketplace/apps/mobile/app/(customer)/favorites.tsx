import { useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { api } from '../../src/lib/api';
import { Avatar } from '../../src/components/Avatar';
import { Card } from '../../src/components/Card';
import { Rating } from '../../src/components/Rating';
import { useTheme } from '../../src/theme/tokens';

type Fav = {
  artisanId: string;
  artisan: {
    avgRating: number;
    ratingCount: number;
    user: { id: string; fullName: string | null; avatarUrl: string | null };
  };
};

export default function Favorites() {
  const t = useTheme();
  const router = useRouter();
  const [favs, setFavs] = useState<Fav[]>([]);

  useEffect(() => {
    api<{ favorites: Fav[] }>('/v1/favorites')
      .then(({ favorites }) => setFavs(favorites))
      .catch(() => {});
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ padding: t.spacing(4) }}>
        <Text style={{ color: t.text, fontSize: t.fontSizes.xl, fontWeight: '700' }}>Favorites</Text>
      </View>
      <FlatList
        data={favs}
        keyExtractor={(f) => f.artisanId}
        contentContainerStyle={{ paddingHorizontal: t.spacing(4), gap: 12 }}
        renderItem={({ item }) => (
          <Card padded onPress={() => router.push({ pathname: '/(customer)/artisan/[id]', params: { id: item.artisanId } })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar uri={item.artisan.user.avatarUrl} name={item.artisan.user.fullName} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontWeight: '700' }}>{item.artisan.user.fullName}</Text>
                <Rating value={item.artisan.avgRating} count={item.artisan.ratingCount} />
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <Text style={{ color: t.textMuted, textAlign: 'center', marginTop: 40 }}>
            No favorites yet.
          </Text>
        }
      />
    </SafeAreaView>
  );
}
