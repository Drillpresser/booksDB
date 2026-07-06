import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { colors, spacing, radius } from '../theme';
import { useAuth } from '../contexts/AuthContext';

type Props = { visible: boolean; onClose: () => void };

export function AuthSheet({ visible, onClose }: Props) {
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [busyGoogle, setBusyGoogle] = useState(false);
  const [busyApple, setBusyApple] = useState(false);
  const busy = busyGoogle || busyApple;

  async function handleGoogle() {
    if (busy) return;
    setBusyGoogle(true);
    try { await signInWithGoogle(); onClose(); }
    finally { setBusyGoogle(false); }
  }

  async function handleApple() {
    if (busy) return;
    setBusyApple(true);
    try { await signInWithApple(); onClose(); }
    finally { setBusyApple(false); }
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
          <Text style={styles.title}>Join BookHoarder</Text>
          <Text style={styles.subtitle}>
            Sign in to rate books and see what other readers think.
          </Text>

          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={radius.md}
              style={styles.appleBtn}
              onPress={handleApple}
            />
          )}

          <TouchableOpacity style={[styles.btn, styles.googleBtn]} onPress={handleGoogle} disabled={busy}>
            {busyGoogle
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
  appleBtn: { width: '100%', height: 52 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, width: '100%', padding: spacing.md, borderRadius: radius.md, justifyContent: 'center', minHeight: 52 },
  googleBtn: { backgroundColor: '#4285F4' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
