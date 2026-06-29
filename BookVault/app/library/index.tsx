import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Image,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../src/theme';
import { getAllCopies, searchCopies } from '../../src/database/queries/books';
import type { BookCopyWithDetails } from '../../src/types';

type SortMode = 'author' | 'title';

export default function LibraryScreen() {
  const router = useRouter();
  const [sortMode, setSortMode] = useState<SortMode>('author');
  const [searchQuery, setSearchQuery] = useState('');
  const [books, setBooks] = useState<BookCopyWithDetails[]>([]);

  useFocusEffect(
    useCallback(() => {
      setBooks(getAllCopies(sortMode));
    }, [sortMode])
  );

  // Per-record availability map: recordId → { total, available }
  const availabilityMap = useMemo(() => {
    const map = new Map<string, { total: number; available: number }>();
    for (const b of books) {
      const rec = map.get(b.recordId) ?? { total: 0, available: 0 };
      rec.total++;
      if (!b.isOnLoan) rec.available++;
      map.set(b.recordId, rec);
    }
    return map;
  }, [books]);

  const displayedBooks = useMemo(() => {
    if (searchQuery.trim()) return searchCopies(searchQuery);
    return books;
  }, [searchQuery, books]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Library</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingBottom: 5 }}>
          <TouchableOpacity onPress={() => router.push('/library/browse')} hitSlop={8}>
            <Ionicons name="earth-outline" size={23} color={colors.accentDark} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/library/add')} hitSlop={8}>
            <Ionicons name="add" size={27} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: spacing.sm }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search your library..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.textSecondary}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {!searchQuery.trim() && (
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort by</Text>
          {(['author', 'title'] as SortMode[]).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.sortChip, sortMode === mode && styles.sortChipActive]}
              onPress={() => setSortMode(mode)}
            >
              <Text style={[styles.sortChipText, sortMode === mode && styles.sortChipTextActive]}>
                {mode === 'author' ? 'Author' : 'Title'}
              </Text>
            </TouchableOpacity>
          ))}
          <Text style={styles.volCount}>{books.length} vols</Text>
        </View>
      )}

      <FlatList
        data={displayedBooks}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => (
          <BookRow
            book={item}
            availability={availabilityMap.get(item.recordId) ?? { total: 1, available: item.isOnLoan ? 0 : 1 }}
            onPress={() => router.push(`/library/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {searchQuery.trim() ? (
              <>
                <Ionicons name="search-outline" size={48} color={colors.border} />
                <Text style={styles.emptySubtitle}>No books match your search.</Text>
              </>
            ) : (
              <>
                <Ionicons name="library-outline" size={64} color={colors.border} />
                <Text style={styles.emptyTitle}>Your library is empty</Text>
                <Text style={styles.emptySubtitle}>Tap + to add your first book</Text>
              </>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return null;
  const filled = Math.round(rating);
  return (
    <Text style={{ fontSize: 11, letterSpacing: 1 }}>
      <Text style={{ color: colors.stars }}>{'★'.repeat(filled)}</Text>
      <Text style={{ color: colors.border }}>{'★'.repeat(5 - filled)}</Text>
    </Text>
  );
}

function availBadge(avail: { total: number; available: number }, isOnLoan: boolean): { label: string; bg: string; color: string } | null {
  const { total, available } = avail;
  if (total === 1) {
    // single copy — simple OUT badge
    return isOnLoan ? { label: 'OUT', bg: colors.onLoan, color: '#fff' } : null;
  }
  // multi-copy book
  if (available === 0) return { label: 'ALL OUT', bg: colors.danger, color: '#fff' };
  if (available < total) return { label: `${available}/${total} avail`, bg: '#FCEAD2', color: colors.primaryDark };
  return null; // all available — no badge needed
}

function BookRow({ book, availability, onPress }: { book: BookCopyWithDetails; availability: { total: number; available: number }; onPress: () => void }) {
  const callCode = book.division
    ? `${book.mainClass?.code ?? ''} ${book.record.sortAuthor?.slice(0, 3).toUpperCase() ?? ''}`.trim()
    : null;

  const badge = availBadge(availability, book.isOnLoan);

  return (
    <TouchableOpacity style={styles.bookRow} onPress={onPress} activeOpacity={0.7}>
      {book.record.coverImage ? (
        <Image source={{ uri: book.record.coverImage }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <View style={styles.spineAccent} />
        </View>
      )}
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={1}>{book.record.title}</Text>
        <Text style={styles.bookAuthor} numberOfLines={1}>{book.record.authors.join(', ')}</Text>
        <View style={styles.bookChips}>
          {callCode && <Text style={styles.callChip}>{callCode}</Text>}
          <StarRating rating={book.personalRating} />
        </View>
      </View>
      <View style={styles.bookMeta}>
        {badge && (
          <View style={[styles.loanBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.loanBadgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={18} color={colors.borderDark} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 6, paddingBottom: 4 },
  heading: { fontSize: 34, fontWeight: '600', color: colors.text, letterSpacing: -0.3, fontFamily: 'Georgia' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, margin: spacing.md, marginBottom: spacing.sm, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, fontSize: 16, color: colors.text },
  sortRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
  sortLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  sortChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  sortChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sortChipText: { fontSize: 13, color: colors.textSecondary },
  sortChipTextActive: { color: '#fff', fontWeight: '600' },
  volCount: { flex: 1, textAlign: 'right', fontSize: 12, color: colors.textMuted, fontFamily: 'Courier' },
  bookRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surfaceCard, marginHorizontal: spacing.md, marginBottom: spacing.sm, borderRadius: 14, padding: 10, borderWidth: 1, borderColor: colors.borderCard },
  cover: { width: 44, height: 64, borderRadius: 4, flexShrink: 0 },
  coverPlaceholder: { backgroundColor: colors.surfaceAlt, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  spineAccent: { position: 'absolute', left: 5, top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.4)' },
  bookInfo: { flex: 1, minWidth: 0 },
  bookTitle: { fontSize: 16, fontWeight: '600', color: colors.text, lineHeight: 19, fontFamily: 'Georgia' },
  bookAuthor: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  bookChips: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
  callChip: { fontSize: 10, letterSpacing: 0.3, color: colors.textMuted, backgroundColor: colors.surfaceAlt, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontFamily: 'Courier' },
  bookMeta: { alignItems: 'flex-end', gap: spacing.xs, flexShrink: 0 },
  loanBadge: { backgroundColor: colors.onLoan, borderRadius: 5, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  loanBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: spacing.md },
  emptySubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
});
