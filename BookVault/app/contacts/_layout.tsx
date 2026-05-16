import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

export default function ContactsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' } }}>
      <Stack.Screen name="[contactId]" options={{ headerShown: true, title: 'Contact' }} />
    </Stack>
  );
}
