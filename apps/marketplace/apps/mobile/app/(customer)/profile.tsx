import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { clearTokens } from '../../src/lib/api';
import { useAuth } from '../../src/lib/store';
import { Avatar } from '../../src/components/Avatar';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { useTheme } from '../../src/theme/tokens';

export default function Profile() {
  const t = useTheme();
  const router = useRouter();
  const { user, setUser } = useAuth();

  async function logout() {
    await clearTokens();
    setUser(null);
    router.replace('/(auth)/phone');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: t.spacing(4), gap: 16 }}>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Avatar uri={user?.avatarUrl} name={user?.fullName} size={84} />
          <Text style={{ color: t.text, fontSize: t.fontSizes.xl, fontWeight: '700' }}>
            {user?.fullName ?? 'Anonymous'}
          </Text>
          <Text style={{ color: t.textMuted }}>{user?.phone}</Text>
        </View>

        <Card padded>
          <Text style={{ color: t.text, fontWeight: '700' }}>Account</Text>
          <Text style={{ color: t.textMuted, marginTop: 4 }}>Role: {user?.role}</Text>
        </Card>

        <Button title="Sign out" variant="danger" onPress={logout} />
      </ScrollView>
    </SafeAreaView>
  );
}
