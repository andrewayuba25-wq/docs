import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/tokens';

export function Rating({ value, count, size = 14 }: { value: number; count?: number; size?: number }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name="star" size={size} color={t.warning} />
      <Text style={{ color: t.text, fontWeight: '600', fontSize: size }}>{value.toFixed(1)}</Text>
      {typeof count === 'number' && (
        <Text style={{ color: t.textMuted, fontSize: size - 2 }}>({count})</Text>
      )}
    </View>
  );
}
