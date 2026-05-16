import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' } }}>
      <Stack.Screen name="classifications" options={{ headerShown: true, title: 'Manage Classifications' }} />
    </Stack>
  );
}
