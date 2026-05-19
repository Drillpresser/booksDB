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

export default function LibraryLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, ...headerOptions }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="add" options={{ headerShown: true, title: 'Add Book', presentation: 'modal', ...backButton }} />
      <Stack.Screen name="[copyId]" options={{ headerShown: true, title: 'Book Detail', ...backButton }} />
    </Stack>
  );
}
