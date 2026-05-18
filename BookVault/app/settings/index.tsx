import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../src/theme';
import { getApiKey, saveApiKey, deleteApiKey } from '../../src/services/claude';
import { useAuth } from '../../src/contexts/AuthContext';
import { AuthSheet } from '../../src/components/AuthSheet';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [authVisible, setAuthVisible] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getApiKey().then((k) => {
      if (k) { setHasKey(true); setApiKey(k); }
    });
  }, []);

  async function handleSaveKey() {
    if (!apiKey.trim()) return;
    setSaving(true);
    try {
      await saveApiKey(apiKey.trim());
      setHasKey(true);
      Alert.alert('Saved', 'Your Anthropic API key has been saved securely.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteKey() {
    Alert.alert('Remove API Key', 'Remove your Anthropic API key? Claude features will be disabled.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteApiKey();
          setApiKey('');
          setHasKey(false);
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Claude AI</Text>
          <Text style={styles.sectionDesc}>
            Add your Anthropic API key to enable Claude features: filling missing book fields and suggesting classifications.
            Your key is stored securely on-device and never leaves your phone.
          </Text>

          {hasKey && (
            <View style={styles.keyStatus}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.keyStatusText}>API key saved</Text>
            </View>
          )}

          <View style={styles.keyRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="sk-ant-..."
              value={apiKey}
              onChangeText={setApiKey}
              secureTextEntry={!showKey}
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={colors.textSecondary}
            />
            <TouchableOpacity onPress={() => setShowKey((v) => !v)} style={styles.eyeBtn}>
              <Ionicons name={showKey ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveKey} disabled={saving || !apiKey.trim()}>
              <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Key'}</Text>
            </TouchableOpacity>
            {hasKey && (
              <TouchableOpacity style={styles.removeBtn} onPress={handleDeleteKey}>
                <Text style={styles.removeBtnText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.hint}>
            Get your API key at console.anthropic.com. Claude Haiku is used by default — usage for a personal library is typically under $1/month.
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Classifications</Text>
          <Text style={styles.sectionDesc}>
            Manage your MainClass → Section → Division hierarchy.
          </Text>
          <TouchableOpacity style={styles.navRow} onPress={() => router.push('/settings/classifications')}>
            <Ionicons name="layers-outline" size={22} color={colors.primary} />
            <Text style={styles.navRowText}>Manage Classifications</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Text style={styles.sectionDesc}>
            Sign in to rate books and see community ratings from other readers.
          </Text>
          {user ? (
            <View style={styles.accountRow}>
              <View style={styles.accountAvatar}>
                <Text style={styles.accountAvatarText}>{(user.email ?? 'U').charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.accountEmail}>{user.email ?? 'Signed in'}</Text>
              </View>
              <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
                <Text style={styles.signOutBtnText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.signInBtn} onPress={() => setAuthVisible(true)}>
              <Text style={styles.signInBtnText}>Sign In</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.sectionDesc}>BookVault — Personal Library Catalog</Text>
          <Text style={styles.hint}>Version 1.0.0</Text>
        </View>
      </ScrollView>

      <AuthSheet visible={authVisible} onClose={() => setAuthVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, gap: spacing.md },
  section: { gap: spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  sectionDesc: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  keyStatus: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  keyStatusText: { fontSize: 14, color: colors.success, fontWeight: '600' },
  keyRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 15, color: colors.text },
  eyeBtn: { padding: spacing.sm },
  btnRow: { flexDirection: 'row', gap: spacing.sm },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  removeBtn: { borderWidth: 1, borderColor: colors.danger, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  removeBtnText: { color: colors.danger, fontWeight: '700' },
  hint: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  accountAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  accountAvatarText: { color: colors.primary, fontWeight: '700', fontSize: 18 },
  accountEmail: { fontSize: 14, color: colors.text },
  signOutBtn: { borderWidth: 1, borderColor: colors.danger, borderRadius: radius.md, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  signOutBtnText: { color: colors.danger, fontWeight: '600', fontSize: 14 },
  signInBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, alignSelf: 'flex-start' },
  signInBtnText: { color: '#fff', fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  navRowText: { flex: 1, fontSize: 16, color: colors.text },
});
