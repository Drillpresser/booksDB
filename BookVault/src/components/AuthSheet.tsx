import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import { useAuth } from '../contexts/AuthContext';

type Props = { visible: boolean; onClose: () => void };

export function AuthSheet({ visible, onClose }: Props) {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);

  async function handleGoogle() {
    setBusy(true);
    try { await signInWithGoogle(); onClose(); }
    finally { setBusy(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={26} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <Ionicons name="star" size={52} color={colors.accent} />
          <Text style={styles.title}>Join BookVault</Text>
          <Text style={styles.subtitle}>
            Sign in to rate books and see what other readers think.
          </Text>

          <TouchableOpacity style={[styles.btn, styles.googleBtn]} onPress={handleGoogle} disabled={busy}>
            {busy
              ? <ActivityIndicator color="#fff" />
              : <><Ionicons name="logo-google" size={20} color="#fff" /><Text style={styles.btnText}>Continue with Google</Text></>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { alignItems: 'flex-end', padding: spacing.md },
  closeBtn: { padding: spacing.sm },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.lg },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, width: '100%', padding: spacing.md, borderRadius: radius.md, justifyContent: 'center', minHeight: 52 },
  googleBtn: { backgroundColor: '#4285F4' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
