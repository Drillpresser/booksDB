import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

const headerOptions = {
  headerStyle: { backgroundColor: '#1A0800' },
  headerTintColor: colors.primary,
  headerTitleStyle: { fontWeight: '700' as const, color: '#FFFFFF' },
  headerTitleAlign: 'center' as const,
  headerShadowVisible: true,
  headerBackTitle: '',
};

export default function ClassificationsLayout() {
  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{ title: 'Classifications' }} />
      <Stack.Screen name="[systemId]" options={{ title: 'Browse System' }} />
    </Stack>
  );
}
