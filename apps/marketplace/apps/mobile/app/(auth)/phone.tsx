import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Button } from '../../src/components/Button';
import { api } from '../../src/lib/api';
import { useTheme } from '../../src/theme/tokens';

export default function Phone() {
  const t = useTheme();
  const router = useRouter();
  const [phone, setPhone] = useState('+');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (!/^\+\d{6,15}$/.test(phone)) {
      setErr('Enter your phone in international format, e.g. +2348012345678');
      return;
    }
    setLoading(true);
    try {
      await api('/v1/auth/otp/request', { method: 'POST', body: { phone }, auth: false });
      router.push({ pathname: '/(auth)/otp', params: { phone } });
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
          Welcome to Artisan
        </Text>
        <Text style={{ color: t.textMuted, marginTop: 8, marginBottom: 24 }}>
          Find trusted artisans nearby. Enter your phone number to continue.
        </Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          placeholder="+2348012345678"
          placeholderTextColor={t.textMuted}
          style={{
            borderWidth: 1,
            borderColor: t.border,
            backgroundColor: t.surface,
            color: t.text,
            borderRadius: t.radii.md,
            padding: 16,
            fontSize: t.fontSizes.md,
          }}
        />
        {err && <Text style={{ color: t.danger, marginTop: 10 }}>{err}</Text>}
        <View style={{ height: 24 }} />
        <Button title="Send code" onPress={submit} loading={loading} />
        <Text style={{ color: t.textMuted, marginTop: 16, fontSize: t.fontSizes.xs, textAlign: 'center' }}>
          By continuing, you agree to our Terms and Privacy Policy.
        </Text>
      </View>
    </SafeAreaView>
  );
}
