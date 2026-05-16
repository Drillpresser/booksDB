import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

export default function LibraryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="add" options={{ headerShown: true, title: 'Add Book', presentation: 'modal' }} />
      <Stack.Screen name="[copyId]" options={{ headerShown: true, title: 'Book Detail' }} />
    </Stack>
  );
}
