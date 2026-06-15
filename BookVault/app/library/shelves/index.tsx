import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, TextInput, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../../src/theme';
import { getAllShelves, createShelf, updateShelf, deleteShelf, getBookCountForShelf } from '../../../src/database/queries/shelves';
import type { Shelf } from '../../../src/types';

export default function ShelvesScreen() {
  const router = useRouter();
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Shelf | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useFocusEffect(
    useCallback(() => { refresh(); }, [])
  );

  function refresh() {
    const s = getAllShelves();
    setShelves(s);
    const c: Record<string, number> = {};
    for (const shelf of s) c[shelf.id] = getBookCountForShelf(shelf.id);
    setCounts(c);
  }

  function openAdd() {
    setEditing(null);
    setName('');
    setDescription('');
    setModalVisible(true);
  }

  function openEdit(shelf: Shelf) {
    setEditing(shelf);
    setName(shelf.name);
    setDescription(shelf.description ?? '');
    setModalVisible(true);
  }

  function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a shelf name.');
      return;
    }
    if (editing) {
      updateShelf(editing.id, name, description.trim() || null);
    } else {
      createShelf(name, description.trim() || null);
    }
    setModalVisible(false);
    refresh();
  }

  function confirmDelete(shelf: Shelf) {
    const count = counts[shelf.id] ?? 0;
    Alert.alert(
      'Delete Shelf',
      count > 0
        ? `"${shelf.name}" has ${count} ${count === 1 ? 'book' : 'books'}. Deleting it will unshelf those books (they won't be deleted).`
        : `Delete "${shelf.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { deleteShelf(shelf.id); refresh(); } },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={shelves}
        keyExtractor={s => s.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: spacing.sm }} />
            <Text style={styles.addBtnText}>New Shelf</Text>
          </TouchableOpacity>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/library/shelves/${item.id}`)}
            activeOpacity={0.8}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="bookmark-outline" size={26} color={colors.primary} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardName}>{item.name}</Text>
              {item.description ? <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text> : null}
              <Text style={styles.cardCount}>{counts[item.id] ?? 0} {(counts[item.id] ?? 0) === 1 ? 'book' : 'books'}</Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => openEdit(item)} hitSlop={8} style={styles.actionBtn}>
                <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDelete(item)} hitSlop={8} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <Ionicons name="chevron-forward" size={18} color={colors.border} />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="bookmark-outline" size={56} color={colors.border} />
            <Text style={styles.emptyTitle}>No shelves yet</Text>
            <Text style={styles.emptyText}>Create shelves to organise your physical or virtual bookcase.</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Shelf' : 'New Shelf'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Shelf name *"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="next"
            />
            <TextInput
              style={styles.input}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>{editing ? 'Save' : 'Create'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, gap: spacing.sm },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.md },
  cardIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  cardBody: { flex: 1, gap: 2 },
  cardName: { fontSize: 16, fontWeight: '600', color: colors.text },
  cardDesc: { fontSize: 13, color: colors.textSecondary },
  cardCount: { fontSize: 12, color: colors.textMuted ?? colors.textSecondary, marginTop: 2 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actionBtn: { padding: spacing.xs },
  empty: { alignItems: 'center', paddingTop: 60, gap: spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.xl },
  modalBox: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md, borderWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 16, color: colors.text },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md },
  cancelBtn: { padding: spacing.md },
  cancelBtnText: { color: colors.textSecondary, fontSize: 15 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
