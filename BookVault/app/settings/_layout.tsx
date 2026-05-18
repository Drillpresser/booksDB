import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

const headerOptions = {
  headerStyle: { backgroundColor: '#8B3500' },
  headerTintColor: '#DAA520',
  headerTitleStyle: { fontWeight: '700' as const, color: '#FFFFFF' },
  headerTitleAlign: 'center' as const,
  headerShadowVisible: true,
  headerBackTitle: '',
};

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, ...headerOptions }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="classifications" options={{ title: 'Manage Classifications' }} />
    </Stack>
  );
}
