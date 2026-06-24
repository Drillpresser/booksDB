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

export default function ShelvesLayout() {
  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{ title: 'My Shelves', ...backButton }} />
      <Stack.Screen name="[libraryId]" options={{ title: 'Manage Shelf', ...backButton }} />
    </Stack>
  );
}
