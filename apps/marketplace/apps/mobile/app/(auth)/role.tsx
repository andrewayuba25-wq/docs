import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../../src/lib/api';
import { useAuth } from '../../src/lib/store';
import { useTheme } from '../../src/theme/tokens';

export default function Role() {
  const t = useTheme();
  const router = useRouter();
  const setUser = useAuth((s) => s.setUser);
  const [loading, setLoading] = useState<'CUSTOMER' | 'ARTISAN' | null>(null);

  async function pick(role: 'CUSTOMER' | 'ARTISAN') {
    setLoading(role);
    try {
      const user = await api<{
        id: string;
        phone: string;
        role: 'CUSTOMER' | 'ARTISAN' | 'ADMIN';
        fullName: string | null;
        avatarUrl: string | null;
      }>('/v1/me/role', { method: 'POST', body: { role } });
      setUser(user);
      router.replace(role === 'ARTISAN' ? '/(artisan)/' : '/(customer)/');
    } finally {
      setLoading(null);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ flex: 1, padding: t.spacing(6), justifyContent: 'center' }}>
        <Text style={{ color: t.text, fontSize: t.fontSizes.xxl, fontWeight: '700', marginBottom: 24 }}>
          How will you use Artisan?
        </Text>

        <RoleCard
          icon="search"
          title="I need a service"
          subtitle="Find verified plumbers, electricians, carpenters and more nearby."
          onPress={() => pick('CUSTOMER')}
          loading={loading === 'CUSTOMER'}
        />
        <View style={{ height: 16 }} />
        <RoleCard
          icon="hammer"
          title="I provide a service"
          subtitle="Earn from your skills. Get booking requests in your area."
          onPress={() => pick('ARTISAN')}
          loading={loading === 'ARTISAN'}
        />
      </View>
    </SafeAreaView>
  );
}

function RoleCard({
  icon, title, subtitle, onPress, loading,
}: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; onPress: () => void; loading: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => ({
        backgroundColor: t.surface,
        borderRadius: t.radii.lg,
        padding: 20,
        borderWidth: 1,
        borderColor: t.border,
        opacity: pressed || loading ? 0.7 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 48, height: 48, borderRadius: t.radii.md,
            backgroundColor: t.primary + '22', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={24} color={t.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.text, fontSize: t.fontSizes.lg, fontWeight: '700' }}>{title}</Text>
          <Text style={{ color: t.textMuted, marginTop: 4, fontSize: t.fontSizes.sm }}>{subtitle}</Text>
        </View>
      </View>
    </Pressable>
  );
}
