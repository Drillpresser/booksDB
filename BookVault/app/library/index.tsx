import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Image,
} from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
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

  const displayedBooks = useMemo(() => {
    if (searchQuery.trim()) return searchCopies(searchQuery);
    return books;
  }, [searchQuery, books]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Stack.Screen options={{ headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.push('/library/browse')} style={{ padding: spacing.xs, marginRight: spacing.xs }}>
            <Ionicons name="earth-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/library/add')} style={{ padding: spacing.xs }}>
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}} />

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
        </View>
      )}

      <FlatList
        data={displayedBooks}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => (
          <BookRow book={item} onPress={() => router.push(`/library/${item.id}`)} />
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

function BookRow({ book, onPress }: { book: BookCopyWithDetails; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.bookRow} onPress={onPress} activeOpacity={0.7}>
      {book.record.coverImage ? (
        <Image source={{ uri: book.record.coverImage }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <Ionicons name="book-outline" size={28} color={colors.border} />
        </View>
      )}
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={2}>{book.record.title}</Text>
        <Text style={styles.bookAuthor} numberOfLines={1}>{book.record.authors.join(', ')}</Text>
        {book.division && (
          <Text style={styles.bookClass} numberOfLines={1}>
            {book.mainClass?.code} › {book.section?.code} › {book.division.code}
          </Text>
        )}
        {book.copyNumber > 1 && (
          <Text style={styles.copyBadge}>Copy {book.copyNumber}</Text>
        )}
      </View>
      <View style={styles.bookMeta}>
        {book.isOnLoan && (
          <View style={styles.loanBadge}>
            <Text style={styles.loanBadgeText}>Out</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, margin: spacing.md, marginBottom: spacing.sm, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, fontSize: 16, color: colors.text },
  sortRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
  sortLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  sortChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  sortChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sortChipText: { fontSize: 13, color: colors.textSecondary },
  sortChipTextActive: { color: '#fff', fontWeight: '600' },
  bookRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, marginHorizontal: spacing.md, marginBottom: spacing.sm, borderRadius: radius.md, padding: spacing.sm, borderWidth: 1, borderColor: colors.border },
  cover: { width: 50, height: 72, borderRadius: radius.sm, marginRight: spacing.md },
  coverPlaceholder: { backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  bookInfo: { flex: 1 },
  bookTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  bookAuthor: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  bookClass: { fontSize: 11, color: colors.primary, marginTop: 4 },
  copyBadge: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  bookMeta: { alignItems: 'flex-end', gap: spacing.xs },
  loanBadge: { backgroundColor: colors.onLoan, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  loanBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: spacing.md },
  emptySubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
});
