import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { colors, fonts, spacing, radius } from '../theme';
import { getMyDisplayName, setMyDisplayName } from '../services/library';

type Props = {
  visible: boolean;
  onClose: () => void;
  // 'prompt' is the once-after-login nudge; 'edit' is the Settings entry point
  variant?: 'prompt' | 'edit';
};

export function DisplayNameDialog({ visible, onClose, variant = 'edit' }: Props) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    getMyDisplayName()
      .then((n) => setName(n === 'Reader' ? '' : n))
      .catch(() => setName(''))
      .finally(() => setLoading(false));
  }, [visible]);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await setMyDisplayName(name);
      onClose();
    } catch (e: any) {
      Alert.alert('Could not save', e.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const isPrompt = variant === 'prompt';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{isPrompt ? 'Choose a display name' : 'Edit display name'}</Text>
          <Text style={styles.desc}>
            {isPrompt
              ? "This is the name other readers see on your shelves and ratings. You don't have to use your real name."
              : 'The name other readers see on your shelves and ratings.'}
          </Text>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
          ) : (
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. BookWyrm"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={40}
              editable={!saving}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          )}

          <View style={styles.row}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} disabled={saving}>
              <Text style={styles.secondaryText}>{isPrompt ? 'Not now' : 'Cancel'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, (!name.trim() || saving) && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={!name.trim() || saving || loading}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: spacing.xl },
  card: { backgroundColor: colors.background, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, fontFamily: fonts.serif },
  desc: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 16, color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
  secondaryBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.md },
  secondaryText: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },
  primaryBtn: { backgroundColor: colors.primary, paddingVertical: spacing.sm, paddingHorizontal: spacing.xl, borderRadius: radius.md, minWidth: 80, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
