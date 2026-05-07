import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

export default function ContactsLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' } }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[contactId]" options={{ title: 'Contact' }} />
    </Stack>
  );
}
