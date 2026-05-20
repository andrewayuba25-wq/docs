import { Pressable, View, type ViewProps } from 'react-native';
import { useTheme } from '../theme/tokens';

type Props = ViewProps & {
  onPress?: () => void;
  padded?: boolean;
};

export function Card({ onPress, padded = true, style, children, ...rest }: Props) {
  const t = useTheme();
  const inner = (
    <View
      style={[
        {
          backgroundColor: t.surface,
          borderRadius: t.radii.lg,
          borderWidth: 1,
          borderColor: t.border,
          padding: padded ? t.spacing(4) : 0,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      {inner}
    </Pressable>
  );
}
