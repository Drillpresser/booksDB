import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import { useAuth } from '../contexts/AuthContext';

type Props = { visible: boolean; onClose: () => void };

export function AuthSheet({ visible, onClose }: Props) {
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null);

  async function handleGoogle() {
    setBusy('google');
    try { await signInWithGoogle(); onClose(); }
    finally { setBusy(null); }
  }

  async function handleApple() {
    setBusy('apple');
    try { await signInWithApple(); onClose(); }
    finally { setBusy(null); }
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

          <TouchableOpacity style={[styles.btn, styles.googleBtn]} onPress={handleGoogle} disabled={!!busy}>
            {busy === 'google'
              ? <ActivityIndicator color="#fff" />
              : <><Ionicons name="logo-google" size={20} color="#fff" /><Text style={styles.btnText}>Continue with Google</Text></>}
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <TouchableOpacity style={[styles.btn, styles.appleBtn]} onPress={handleApple} disabled={!!busy}>
              {busy === 'apple'
                ? <ActivityIndicator color="#fff" />
                : <><Ionicons name="logo-apple" size={20} color="#fff" /><Text style={styles.btnText}>Continue with Apple</Text></>}
            </TouchableOpacity>
          )}
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
  appleBtn: { backgroundColor: '#1C1C1E' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
