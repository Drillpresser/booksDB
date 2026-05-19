import { Stack } from 'expo-router';
import { HeaderBackButton } from '../../src/components/HeaderBackButton';

const headerOptions = {
  headerStyle: { backgroundColor: '#1A0800' },
  headerTintColor: '#DAA520',
  headerTitleStyle: { fontWeight: '700' as const, color: '#FFFFFF' },
  headerTitleAlign: 'center' as const,
  headerShadowVisible: true,
  headerBackTitle: '',
};

const backButton = { headerLeft: ({ canGoBack }: { canGoBack?: boolean }) => <HeaderBackButton canGoBack={canGoBack} /> };

export default function ContactsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, ...headerOptions }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[contactId]" options={{ headerShown: true, title: 'Contact', ...backButton }} />
    </Stack>
  );
}
