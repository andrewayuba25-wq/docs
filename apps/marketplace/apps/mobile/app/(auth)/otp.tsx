import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../src/components/Button';
import { api, setTokens } from '../../src/lib/api';
import { useAuth } from '../../src/lib/store';
import { useTheme } from '../../src/theme/tokens';

type VerifyResp = {
  accessToken: string;
  refreshToken: string;
  isNew: boolean;
  user: {
    id: string;
    phone: string;
    role: 'CUSTOMER' | 'ARTISAN' | 'ADMIN';
    fullName: string | null;
    avatarUrl: string | null;
  };
};

export default function Otp() {
  const t = useTheme();
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const setUser = useAuth((s) => s.setUser);

  async function submit() {
    setErr(null);
    if (code.length !== 6) {
      setErr('Enter the 6-digit code we sent you.');
      return;
    }
    setLoading(true);
    try {
      const data = await api<VerifyResp>('/v1/auth/otp/verify', {
        method: 'POST',
        body: { phone, code },
        auth: false,
      });
      await setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      router.replace(data.isNew ? '/(auth)/role' : data.user.role === 'ARTISAN' ? '/(artisan)/' : '/(customer)/');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ flex: 1, padding: t.spacing(6), justifyContent: 'center' }}>
        <Text style={{ color: t.text, fontSize: t.fontSizes.xxl, fontWeight: '700' }}>
          Enter your code
        </Text>
        <Text style={{ color: t.textMuted, marginTop: 8, marginBottom: 24 }}>
          We sent a 6-digit code to {phone}. (Dev mode: check the API server logs.)
        </Text>
        <TextInput
          value={code}
          onChangeText={(s) => setCode(s.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          placeholder="123456"
          placeholderTextColor={t.textMuted}
          style={{
            borderWidth: 1,
            borderColor: t.border,
            backgroundColor: t.surface,
            color: t.text,
            borderRadius: t.radii.md,
            padding: 16,
            fontSize: 24,
            letterSpacing: 8,
            textAlign: 'center',
          }}
        />
        {err && <Text style={{ color: t.danger, marginTop: 10 }}>{err}</Text>}
        <View style={{ height: 24 }} />
        <Button title="Verify" onPress={submit} loading={loading} />
      </View>
    </SafeAreaView>
  );
}
