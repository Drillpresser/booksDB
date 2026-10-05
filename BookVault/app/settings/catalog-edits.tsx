import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, spacing, radius } from '../../src/theme';
import { getPendingEditsForMyBooks, reviewCommunityEdit } from '../../src/services/communityCatalog';
import type { CommunityEdit, CommunityEditChanges } from '../../src/services/communityCatalog';
import { formatDate } from '../../src/lib/dates';

const FIELD_LABELS: Record<keyof CommunityEditChanges, string> = {
  title: 'Title',
  authors: 'Author(s)',
  publisher: 'Publisher',
  published_year: 'Year',
  page_count: 'Pages',
  synopsis: 'Synopsis',
  cover_url: 'Cover image',
  dewey_decimal: 'Dewey Decimal',
};

function display(value: unknown): string {
  if (value === null || value === undefined || value === '') return '(empty)';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '(empty)';
  return String(value);
}

// Suggestions other readers made to shared catalog entries this user contributed.
export default function CatalogEditsScreen() {
  const [edits, setEdits] = useState<CommunityEdit[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    setLoading(true);
    try {
      setEdits(await getPendingEditsForMyBooks());
    } catch {
      Alert.alert('Error', 'Could not load suggested edits. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  async function review(edit: CommunityEdit, approve: boolean) {
    setReviewingId(edit.id);
    try {
      await reviewCommunityEdit(edit.id, approve);
      setEdits((prev) => prev.filter((e) => e.id !== edit.id));
    } catch {
      Alert.alert('Error', 'Could not save your review. Please try again.');
    } finally {
      setReviewingId(null);
    }
  }

  if (loading && edits.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={edits}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        onRefresh={load}
        refreshing={loading}
        ListHeaderComponent={
          <Text style={styles.intro}>
            You added these books to the shared catalog. Other readers suggested changes —
            approved changes are shown to everyone who adds the book.
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-outline" size={44} color={colors.border} />
            <Text style={styles.emptyText}>No suggested edits right now.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const busy = reviewingId === item.id;
          const fields = Object.keys(item.changes) as (keyof CommunityEditChanges)[];
          return (
            <View style={styles.card}>
              <Text style={styles.bookTitle} numberOfLines={2}>{item.current.title ?? item.isbn13}</Text>
              <Text style={styles.meta}>
                Suggested by {item.proposerName} · {formatDate(item.createdAt)} · ISBN {item.isbn13}
              </Text>
              {fields.map((field) => (
                <View key={field} style={styles.change}>
                  <Text style={styles.fieldLabel}>{FIELD_LABELS[field] ?? field}</Text>
                  <Text style={styles.oldValue} numberOfLines={field === 'synopsis' ? 4 : 2}>
                    {display(item.current[field])}
                  </Text>
                  <View style={styles.arrowRow}>
                    <Ionicons name="arrow-down" size={14} color={colors.textMuted} />
                  </View>
                  <Text style={styles.newValue} numberOfLines={field === 'synopsis' ? 6 : 3}>
                    {display(item.changes[field])}
                  </Text>
                </View>
              ))}
              <View style={styles.actions}>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => review(item, false)} disabled={busy}>
                  <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.approveBtn} onPress={() => review(item, true)} disabled={busy}>
                  {busy
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.approveText}>Approve</Text>}
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.md, gap: spacing.md },
  intro: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.xs },
  empty: { alignItems: 'center', paddingTop: 60, gap: spacing.md },
  emptyText: { color: colors.textSecondary, fontSize: 15 },
  card: { backgroundColor: colors.surfaceCard, borderRadius: 14, borderWidth: 1, borderColor: colors.borderCard, padding: spacing.md, gap: spacing.sm },
  bookTitle: { fontSize: 17, fontWeight: '600', color: colors.text, fontFamily: fonts.serif },
  meta: { fontSize: 12, color: colors.textMuted },
  change: { backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.sm, gap: 2 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: colors.primaryDark, textTransform: 'uppercase', letterSpacing: 1.2, fontFamily: fonts.mono },
  oldValue: { fontSize: 14, color: colors.textMuted, textDecorationLine: 'line-through' },
  arrowRow: { paddingVertical: 1 },
  newValue: { fontSize: 14, color: colors.text, fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.xs },
  rejectBtn: { borderWidth: 1, borderColor: colors.danger, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  rejectText: { color: colors.danger, fontWeight: '700' },
  approveBtn: { backgroundColor: colors.success, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, minWidth: 96, alignItems: 'center' },
  approveText: { color: '#fff', fontWeight: '700' },
});
