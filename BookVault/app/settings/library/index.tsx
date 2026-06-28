import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Alert, Modal, ScrollView, Switch, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../../src/theme';
import { useAuth } from '../../../src/contexts/AuthContext';
import { getMyLibraries, createLibrary, updateLibrary } from '../../../src/services/library';
import type { Library } from '../../../src/services/library';

export default function MyLibrariesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);
  const [createVisible, setCreateVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPublic, setNewPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkToggling, setBulkToggling] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user) { setLoading(false); return; }
      load();
    }, [user])
  );

  async function load() {
    setLoading(true);
    try {
      const data = await getMyLibraries();
      setLibraries(data);
    } catch {
      setLibraries([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkToggle(makePublic: boolean) {
    if (libraries.length === 0) return;
    setBulkToggling(true);
    try {
      await Promise.all(libraries.map((lib) => updateLibrary(lib.id, { isPublic: makePublic })));
      await load();
    } catch {
      Alert.alert('Error', 'Could not update all shelves.');
    } finally {
      setBulkToggling(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) {
      Alert.alert('Name Required', 'Enter a name for your shelf.');
      return;
    }
    setSaving(true);
    try {
      const lib = await createLibrary(newName.trim(), newDesc.trim() || null, newPublic);
      if (!lib) throw new Error('Failed');
      setCreateVisible(false);
      setNewName('');
      setNewDesc('');
      setNewPublic(true);
      await load();
    } catch {
      Alert.alert('Error', 'Could not create shelf. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="person-outline" size={48} color={colors.border} />
          <Text style={styles.emptyTitle}>Sign in required</Text>
          <Text style={styles.emptySubtitle}>Sign in from Settings to manage your shelves.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (
        <FlatList
          data={libraries}
          keyExtractor={(l) => l.id}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push(`/settings/library/${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="library" size={22} color={colors.primary} />
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{item.name}</Text>
                {item.description ? (
                  <Text style={styles.rowDesc} numberOfLines={1}>{item.description}</Text>
                ) : null}
                <Text style={styles.rowMeta}>{item.isPublic ? 'Public' : 'Private'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          ListHeaderComponent={libraries.length > 1 ? (
            <View style={styles.bulkRow}>
              <Text style={styles.bulkLabel}>All Shelves</Text>
              <TouchableOpacity
                style={[styles.bulkBtn, bulkToggling && { opacity: 0.5 }]}
                onPress={() => handleBulkToggle(true)}
                disabled={bulkToggling}
              >
                <Text style={styles.bulkBtnText}>Make All Public</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bulkBtn, bulkToggling && { opacity: 0.5 }]}
                onPress={() => handleBulkToggle(false)}
                disabled={bulkToggling}
              >
                <Text style={styles.bulkBtnText}>Make All Private</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="library-outline" size={64} color={colors.border} />
              <Text style={styles.emptyTitle}>No shelves yet</Text>
              <Text style={styles.emptySubtitle}>Create your first shelf to share your collection.</Text>
            </View>
          }
          ListFooterComponent={
            <TouchableOpacity style={styles.createBtn} onPress={() => setCreateVisible(true)}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.createBtnText}>New Shelf</Text>
            </TouchableOpacity>
          }
        />
      )}

      <Modal visible={createVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Shelf</Text>
            <TouchableOpacity onPress={() => { setCreateVisible(false); setNewName(''); setNewDesc(''); setNewPublic(true); }}>
              <Ionicons name="close" size={26} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
            <Text style={styles.fieldLabel}>Shelf Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Favorites, Science Fiction, Lendables..."
              value={newName}
              onChangeText={setNewName}
              autoFocus
              placeholderTextColor={colors.textSecondary}
            />
            <Text style={styles.fieldLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.input, { minHeight: 70 }]}
              placeholder="A short description of your shelf..."
              value={newDesc}
              onChangeText={setNewDesc}
              multiline
              placeholderTextColor={colors.textSecondary}
            />
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Public Shelf</Text>
                <Text style={styles.switchHint}>Anyone can browse and apply for a card</Text>
              </View>
              <Switch
                value={newPublic}
                onValueChange={setNewPublic}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, saving && { opacity: 0.6 }]}
              onPress={handleCreate}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>Create Shelf</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: spacing.md, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center', lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  rowIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 16, fontWeight: '700', color: colors.text },
  rowDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  rowMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 15, color: colors.text },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  switchLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  switchHint: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  bulkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm, flexWrap: 'wrap' },
  bulkLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, flex: 1 },
  bulkBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  bulkBtnText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
});
