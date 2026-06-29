import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

const headerOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.primary,
  headerTitleStyle: { fontWeight: '600' as const, color: colors.text },
  headerTitleAlign: 'center' as const,
  headerShadowVisible: false,
  headerBackTitle: '',
};

export default function LibraryLayout() {
  return (
    <Stack screenOptions={{ ...headerOptions }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="add" options={{ title: 'Add Book', presentation: 'modal' }} />
      <Stack.Screen name="[copyId]" options={{ title: '' }} />
      <Stack.Screen name="browse" options={{ title: 'Browse Shelves' }} />
      <Stack.Screen name="view" options={{ headerShown: false }} />
      <Stack.Screen name="invite" options={{ headerShown: false }} />
    </Stack>
  );
}
