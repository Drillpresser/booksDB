import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator, Platform, Alert, ScrollView, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { colors, spacing, radius } from '../theme';
import { useAuth } from '../contexts/AuthContext';

type Props = { visible: boolean; onClose: () => void };
type Mode = 'signin' | 'signup';

export function AuthSheet({ visible, onClose }: Props) {
  const { signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail } = useAuth();
  const [busyGoogle, setBusyGoogle] = useState(false);
  const [busyApple, setBusyApple] = useState(false);
  const [busyEmail, setBusyEmail] = useState(false);
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const busy = busyGoogle || busyApple || busyEmail;

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

  async function handleEmail() {
    if (busy) return;
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      Alert.alert('Enter your email', 'Please provide a valid email address.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Password too short', 'Your password must be at least 8 characters.');
      return;
    }
    setBusyEmail(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(trimmed, password);
        onClose();
      } else {
        const { needsConfirmation } = await signUpWithEmail(trimmed, password);
        if (needsConfirmation) {
          Alert.alert(
            'Confirm your email',
            `We sent a confirmation link to ${trimmed}. Tap it to activate your account, then sign in.`
          );
          setMode('signin');
          setPassword('');
        } else {
          onClose();
        }
      }
    } catch (e: any) {
      Alert.alert(mode === 'signin' ? 'Sign in failed' : 'Sign up failed', e.message ?? 'Please try again.');
    } finally {
      setBusyEmail(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={26} color={colors.text} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
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

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              editable={!busy}
            />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType={mode === 'signup' ? 'newPassword' : 'password'}
              editable={!busy}
              onSubmitEditing={handleEmail}
              returnKeyType="go"
            />

            <TouchableOpacity style={[styles.btn, styles.emailBtn]} onPress={handleEmail} disabled={busy}>
              {busyEmail
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>{mode === 'signin' ? 'Sign In' : 'Create Account'}</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMode((m) => (m === 'signin' ? 'signup' : 'signin'))}
              disabled={busy}
              style={styles.toggleBtn}
            >
              <Text style={styles.toggleText}>
                {mode === 'signin' ? "Need an account? " : 'Have an account? '}
                <Text style={styles.toggleLink}>{mode === 'signin' ? 'Sign up' : 'Sign in'}</Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { alignItems: 'flex-end', padding: spacing.md },
  closeBtn: { padding: spacing.sm },
  body: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.md },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: spacing.sm },
  appleBtn: { width: '100%', height: 52 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, width: '100%', padding: spacing.md, borderRadius: radius.md, justifyContent: 'center', minHeight: 52 },
  googleBtn: { backgroundColor: '#4285F4' },
  emailBtn: { backgroundColor: colors.primary },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: spacing.md, marginVertical: spacing.xs },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 13, color: colors.textSecondary },
  input: { width: '100%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 16, color: colors.text },
  toggleBtn: { paddingVertical: spacing.sm },
  toggleText: { fontSize: 14, color: colors.textSecondary },
  toggleLink: { color: colors.primary, fontWeight: '700' },
});
