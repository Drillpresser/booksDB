import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

export default function LibraryLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="add" options={{ title: 'Add Book', presentation: 'modal' }} />
      <Stack.Screen name="[copyId]" options={{ title: 'Book Detail' }} />
    </Stack>
  );
}
