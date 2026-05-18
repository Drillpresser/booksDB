import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type Props = { canGoBack?: boolean };

export function HeaderBackButton({ canGoBack }: Props) {
  const router = useRouter();
  if (!canGoBack) return null;
  return (
    <TouchableOpacity style={styles.btn} onPress={() => router.back()} hitSlop={8}>
      <Ionicons name="chevron-back" size={20} color="#1A0800" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: '#DAA520',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 4,
  },
});
