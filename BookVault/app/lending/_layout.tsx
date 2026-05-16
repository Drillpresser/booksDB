import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

export default function LendingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' } }} />
  );
}
