import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  Alert, ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../src/theme';
import { getAllSystems, deleteSystem, getNodeCountForSystem } from '../../src/database/queries/classificationSystems';
import { pickAndImportSystem } from '../../src/services/classificationImport';
import type { ClassificationSystem } from '../../src/types';

export default function ClassificationsScreen() {
  const router = useRouter();
  const [systems, setSystems] = useState<ClassificationSystem[]>([]);
  const [nodeCounts, setNodeCounts] = useState<Record<string, number>>({});
  const [importing, setImporting] = useState(false);
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [pendingName, setPendingName] = useState('');

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [])
  );

  function refresh() {
    const s = getAllSystems();
    setSystems(s);
    const counts: Record<string, number> = {};
    for (const sys of s) counts[sys.id] = getNodeCountForSystem(sys.id);
    setNodeCounts(counts);
  }

  function startImport() {
    setPendingName('');
    setNameModalVisible(true);
  }

  async function doImport() {
    const name = pendingName.trim();
    if (!name) {
      Alert.alert('Name Required', 'Please enter a name for this classification system.');
      return;
    }
    setNameModalVisible(false);
    setImporting(true);
    try {
      const result = await pickAndImportSystem(name);
      refresh();
      Alert.alert('Imported', `"${name}" imported with ${result.nodeCount} entries.`);
    } catch (e: any) {
      if (e.message !== 'CANCELLED') {
        Alert.alert('Import Failed', e.message ?? 'Could not parse the file. Check the format and try again.');
      }
    } finally {
      setImporting(false);
    }
  }

  function confirmDelete(system: ClassificationSystem) {
    Alert.alert(
      'Delete System',
      `Delete "${system.name}" and all its entries? Books classified in this system will lose their classification.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { deleteSystem(system.id); refresh(); } },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={systems}
        keyExtractor={s => s.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.subtitle}>
              Import your own library classification schemes — Dewey Decimal, Library of Congress, or any custom taxonomy.
            </Text>
            <TouchableOpacity style={styles.importBtn} onPress={startImport} disabled={importing}>
              {importing
                ? <ActivityIndicator color="#fff" size="small" />
                : <><Ionicons name="cloud-upload-outline" size={20} color="#fff" style={{ marginRight: spacing.sm }} /><Text style={styles.importBtnText}>Import Classification System</Text></>}
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/classifications/${item.id}`)}
            activeOpacity={0.8}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="library-outline" size={28} color={colors.primary} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardMeta}>{nodeCounts[item.id] ?? 0} entries · Added {new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
            <TouchableOpacity onPress={() => confirmDelete(item)} hitSlop={12} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="folder-open-outline" size={56} color={colors.border} />
            <Text style={styles.emptyTitle}>No classification systems yet</Text>
            <Text style={styles.emptyText}>Import a CSV or JSON file to get started.</Text>
          </View>
        }
      />

      <Modal visible={nameModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Name This System</Text>
            <Text style={styles.modalDesc}>Give the system a name, then choose a file to import.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Dewey Decimal, My Genres…"
              placeholderTextColor={colors.textSecondary}
              value={pendingName}
              onChangeText={setPendingName}
              autoFocus
              onSubmitEditing={doImport}
              returnKeyType="next"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setNameModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={doImport}>
                <Text style={styles.modalConfirmText}>Choose File →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, gap: spacing.sm },
  header: { gap: spacing.md, marginBottom: spacing.sm },
  subtitle: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  importBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md },
  importBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.md },
  cardIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  cardBody: { flex: 1, gap: 2 },
  cardName: { fontSize: 16, fontWeight: '600', color: colors.text },
  cardMeta: { fontSize: 13, color: colors.textSecondary },
  deleteBtn: { padding: spacing.xs },
  empty: { alignItems: 'center', paddingTop: 60, gap: spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.xl },
  modalBox: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md, borderWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  modalDesc: { fontSize: 14, color: colors.textSecondary },
  modalInput: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 16, color: colors.text },
  modalActions: { flexDirection: 'row', gap: spacing.md, justifyContent: 'flex-end' },
  modalCancel: { padding: spacing.md },
  modalCancelText: { color: colors.textSecondary, fontSize: 15 },
  modalConfirm: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  modalConfirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
