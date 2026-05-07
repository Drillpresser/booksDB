import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' } }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="classifications" options={{ title: 'Manage Classifications' }} />
    </Stack>
  );
}
