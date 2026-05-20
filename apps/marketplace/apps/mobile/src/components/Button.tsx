import { ActivityIndicator, Pressable, Text, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/tokens';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({ title, onPress, variant = 'primary', loading, disabled, style }: Props) {
  const t = useTheme();
  const bg =
    variant === 'primary' ? t.primary
    : variant === 'danger' ? t.danger
    : variant === 'secondary' ? t.surfaceAlt
    : 'transparent';
  const fg =
    variant === 'primary' || variant === 'danger' ? '#fff'
    : variant === 'ghost' ? t.primary
    : t.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => ({
        backgroundColor: bg,
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: t.radii.md,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        ...style,
      })}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={{ color: fg, fontWeight: '600', fontSize: t.fontSizes.md }}>{title}</Text>
      )}
    </Pressable>
  );
}
