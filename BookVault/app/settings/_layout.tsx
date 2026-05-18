import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

const headerOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: '#DAA520',
  headerTitleStyle: { fontWeight: '700' as const, color: colors.text },
  headerTitleAlign: 'center' as const,
  headerShadowVisible: true,
};

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, ...headerOptions }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="classifications" options={{ title: 'Manage Classifications' }} />
    </Stack>
  );
}
