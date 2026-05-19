import { Stack } from 'expo-router';

const headerOptions = {
  headerStyle: { backgroundColor: '#1A0800' },
  headerTintColor: '#DAA520',
  headerTitleStyle: { fontWeight: '700' as const, color: '#FFFFFF' },
  headerTitleAlign: 'center' as const,
  headerShadowVisible: true,
  headerBackTitle: '',
};

export default function LendingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, ...headerOptions }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
