import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, TextInput, Modal, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../../src/theme';
import { getShelfById, updateShelf, deleteShelf } from '../../../src/database/queries/shelves';
import { getCopiesByShelf } from '../../../src/database/queries/books';
import type { BookCopyWithDetails, Shelf } from '../../../src/types';

export default function ShelfDetailScreen() {
  const { shelfId } = useLocalSearchParams<{ shelfId: string }>();
  const router = useRouter();
  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [books, setBooks] = useState<BookCopyWithDetails[]>([]);
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!shelfId) return;
      const s = getShelfById(shelfId);
      setShelf(s);
      setBooks(getCopiesByShelf(shelfId));
    }, [shelfId])
  );

  function openEdit() {
    if (!shelf) return;
    setEditName(shelf.name);
    setEditDesc(shelf.description ?? '');
    setEditVisible(true);
  }

  function handleSaveEdit() {
    if (!shelf || !editName.trim()) return;
    updateShelf(shelf.id, editName, editDesc.trim() || null);
    setShelf(s => s ? { ...s, name: editName.trim(), description: editDesc.trim() || null } : s);
    setEditVisible(false);
  }

  function confirmDelete() {
    if (!shelf) return;
    Alert.alert(
      'Delete Shelf',
      `Delete "${shelf.name}"? Books won't be deleted — they'll just no longer be on this shelf.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: () => {
            deleteShelf(shelf.id);
            router.back();
          }
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: shelf?.name ?? 'Shelf',
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <TouchableOpacity onPress={openEdit} style={{ padding: spacing.xs }}>
                <Ionicons name="pencil-outline" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDelete} style={{ padding: spacing.xs }}>
                <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <FlatList
        data={books}
        keyExtractor={b => b.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          shelf?.description ? (
            <Text style={styles.shelfDesc}>{shelf.description}</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.bookRow}
            onPress={() => router.push(`/library/${item.id}`)}
            activeOpacity={0.7}
          >
            {item.record.coverImage ? (
              <Image source={{ uri: item.record.coverImage }} style={styles.cover} />
            ) : (
              <View style={[styles.cover, styles.coverPlaceholder]}>
                <Ionicons name="book-outline" size={26} color={colors.border} />
              </View>
            )}
            <View style={styles.bookInfo}>
              <Text style={styles.bookTitle} numberOfLines={2}>{item.record.title}</Text>
              <Text style={styles.bookAuthor} numberOfLines={1}>{item.record.authors.join(', ')}</Text>
              {item.copyNumber > 1 && (
                <Text style={styles.copyBadge}>Copy {item.copyNumber}</Text>
              )}
            </View>
            <View style={styles.bookMeta}>
              {item.isOnLoan && (
                <View style={styles.loanBadge}>
                  <Text style={styles.loanBadgeText}>Out</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="bookmark-outline" size={48} color={colors.border} />
            <Text style={styles.emptyText}>No books on this shelf yet.</Text>
            <Text style={styles.emptyHint}>Assign a shelf when adding or editing a book.</Text>
          </View>
        }
      />

      <Modal visible={editVisible} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit Shelf</Text>
            <TextInput
              style={styles.input}
              placeholder="Shelf name *"
              placeholderTextColor={colors.textSecondary}
              value={editName}
              onChangeText={setEditName}
              autoFocus
              returnKeyType="next"
            />
            <TextInput
              style={styles.input}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textSecondary}
              value={editDesc}
              onChangeText={setEditDesc}
              returnKeyType="done"
              onSubmitEditing={handleSaveEdit}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
                <Text style={styles.saveBtnText}>Save</Text>
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
  shelfDesc: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.sm, lineHeight: 20 },
  bookRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, borderWidth: 1, borderColor: colors.border },
  cover: { width: 50, height: 72, borderRadius: radius.sm, marginRight: spacing.md },
  coverPlaceholder: { backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  bookInfo: { flex: 1 },
  bookTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  bookAuthor: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  copyBadge: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  bookMeta: { alignItems: 'flex-end', gap: spacing.xs },
  loanBadge: { backgroundColor: colors.onLoan, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  loanBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.text },
  emptyHint: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
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
