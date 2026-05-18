import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

const headerOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: '#DAA520',
  headerTitleStyle: { fontWeight: '700' as const, color: colors.text },
  headerTitleAlign: 'center' as const,
  headerShadowVisible: true,
};

export default function LendingLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, ...headerOptions }}>
      <Stack.Screen name="index" options={{ title: 'Lending' }} />
    </Stack>
  );
}
