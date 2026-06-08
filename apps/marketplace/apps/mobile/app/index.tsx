import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '../src/theme/tokens';

// Root index serves as the splash placeholder while _layout decides where to route.
export default function Index() {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={t.primary} />
    </View>
  );
}
