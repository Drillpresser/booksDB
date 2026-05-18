import { Stack } from 'expo-router';
import { colors } from '../../src/theme';
import { HeaderBackButton } from '../../src/components/HeaderBackButton';

const headerOptions = {
  headerStyle: { backgroundColor: '#1A0800' },
  headerTintColor: '#DAA520',
  headerTitleStyle: { fontWeight: '700' as const, color: '#FFFFFF' },
  headerTitleAlign: 'center' as const,
  headerShadowVisible: true,
  headerBackTitle: '',
  headerLeft: ({ canGoBack }: { canGoBack?: boolean }) => <HeaderBackButton canGoBack={canGoBack} />,
};

export default function LibraryLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, ...headerOptions }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="add" options={{ title: 'Add Book', presentation: 'modal' }} />
      <Stack.Screen name="[copyId]" options={{ title: 'Book Detail' }} />
    </Stack>
  );
}
