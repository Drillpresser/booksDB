import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  ScrollView, StyleSheet, Image,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../src/theme';
import { getAllCopies, searchCopies } from '../../src/database/queries/books';
import { getAllMainClasses, getSectionsByMainClass, getDivisionsBySection, getBookCountForMainClass, getBookCountForSection } from '../../src/database/queries/classifications';
import type { BookCopyWithDetails, MainClass, Section, Division, SortMode } from '../../src/types';

type BrowseLevel =
  | { type: 'root' }
  | { type: 'section'; mainClass: MainClass }
  | { type: 'division'; mainClass: MainClass; section: Section }
  | { type: 'books'; mainClass: MainClass; section: Section; division: Division };

export default function LibraryScreen() {
  const router = useRouter();
  const [sortMode, setSortMode] = useState<SortMode>('classification');
  const [browseLevel, setBrowseLevel] = useState<BrowseLevel>({ type: 'root' });
  const [searchQuery, setSearchQuery] = useState('');
  const [books, setBooks] = useState<BookCopyWithDetails[]>([]);
  const [mainClasses, setMainClasses] = useState<MainClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [sortMode])
  );

  function loadData() {
    setBooks(getAllCopies(sortMode === 'classification' ? 'classification' : sortMode as any));
    setMainClasses(getAllMainClasses());
  }

  const isSearching = searchQuery.length > 0;
  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    return searchCopies(searchQuery);
  }, [searchQuery, isSearching]);

  function handleMainClassPress(mc: MainClass) {
    setSections(getSectionsByMainClass(mc.id));
    setBrowseLevel({ type: 'section', mainClass: mc });
  }

  function handleSectionPress(mc: MainClass, sec: Section) {
    setDivisions(getDivisionsBySection(sec.id));
    setBrowseLevel({ type: 'division', mainClass: mc, section: sec });
  }

  function handleDivisionPress(mc: MainClass, sec: Section, div: Division) {
    setBrowseLevel({ type: 'books', mainClass: mc, section: sec, division: div });
  }

  function handleBack() {
    if (browseLevel.type === 'books') {
      setBrowseLevel({ type: 'division', mainClass: browseLevel.mainClass, section: browseLevel.section });
    } else if (browseLevel.type === 'division') {
      setBrowseLevel({ type: 'section', mainClass: browseLevel.mainClass });
    } else if (browseLevel.type === 'section') {
      setBrowseLevel({ type: 'root' });
    }
  }

  const displayedBooks = useMemo(() => {
    if (isSearching) return searchResults;
    if (browseLevel.type === 'books') {
      return books.filter((b) => b.divisionId === browseLevel.division.id);
    }
    if (sortMode !== 'classification') return books;
    return [];
  }, [books, browseLevel, sortMode, isSearching, searchResults]);

  const showFlatBookList = sortMode !== 'classification' || isSearching || browseLevel.type === 'books';

  function renderBreadcrumb() {
    if (browseLevel.type === 'root') return null;
    const parts: string[] = [];
    if (browseLevel.type === 'section') parts.push(browseLevel.mainClass.name);
    if (browseLevel.type === 'division') parts.push(browseLevel.mainClass.name, browseLevel.section.name);
    if (browseLevel.type === 'books') parts.push(browseLevel.mainClass.name, browseLevel.section.name, browseLevel.division.name);
    return (
      <TouchableOpacity onPress={handleBack} style={styles.breadcrumb}>
        <Ionicons name="chevron-back" size={16} color={colors.primary} />
        <Text style={styles.breadcrumbText} numberOfLines={1}>{parts.join(' › ')}</Text>
      </TouchableOpacity>
    );
  }

  function renderClassificationBrowser() {
    if (browseLevel.type === 'root') {
      return (
        <FlatList
          data={mainClasses}
          keyExtractor={(m) => m.id}
          renderItem={({ item: mc }) => {
            const count = getBookCountForMainClass(mc.id);
            return (
              <TouchableOpacity style={styles.classRow} onPress={() => handleMainClassPress(mc)}>
                <View style={styles.classCode}><Text style={styles.classCodeText}>{mc.code}</Text></View>
                <View style={styles.classInfo}>
                  <Text style={styles.className}>{mc.name}</Text>
                  <Text style={styles.classCount}>{count} {count === 1 ? 'book' : 'books'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="library-outline" size={64} color={colors.border} />
              <Text style={styles.emptyTitle}>Your library is empty</Text>
              <Text style={styles.emptySubtitle}>Tap + to add your first book</Text>
            </View>
          }
        />
      );
    }

    if (browseLevel.type === 'section') {
      return (
        <FlatList
          data={sections}
          keyExtractor={(s) => s.id}
          renderItem={({ item: sec }) => {
            const count = getBookCountForSection(sec.id);
            return (
              <TouchableOpacity style={styles.classRow} onPress={() => handleSectionPress(browseLevel.mainClass, sec)}>
                <View style={styles.classCode}><Text style={styles.classCodeText}>{sec.code}</Text></View>
                <View style={styles.classInfo}>
                  <Text style={styles.className}>{sec.name}</Text>
                  <Text style={styles.classCount}>{count} {count === 1 ? 'book' : 'books'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<Text style={styles.emptySubtitle}>No sections in this class yet.</Text>}
        />
      );
    }

    if (browseLevel.type === 'division') {
      return (
        <FlatList
          data={divisions}
          keyExtractor={(d) => d.id}
          renderItem={({ item: div }) => {
            const count = books.filter((b) => b.divisionId === div.id).length;
            return (
              <TouchableOpacity style={styles.classRow} onPress={() => handleDivisionPress(browseLevel.mainClass, browseLevel.section, div)}>
                <View style={styles.classCode}><Text style={styles.classCodeText}>{div.code}</Text></View>
                <View style={styles.classInfo}>
                  <Text style={styles.className}>{div.name}</Text>
                  <Text style={styles.classCount}>{count} {count === 1 ? 'book' : 'books'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<Text style={styles.emptySubtitle}>No divisions in this section yet.</Text>}
        />
      );
    }

    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Library</Text>
        <TouchableOpacity onPress={() => router.push('/library/add')} style={styles.addButton}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: spacing.sm }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search books..."
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

      {!isSearching && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortBar} contentContainerStyle={styles.sortBarContent}>
          {(['classification', 'author', 'title', 'dateAdded'] as SortMode[]).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.sortChip, sortMode === mode && styles.sortChipActive]}
              onPress={() => { setSortMode(mode); setBrowseLevel({ type: 'root' }); }}
            >
              <Text style={[styles.sortChipText, sortMode === mode && styles.sortChipTextActive]}>
                {mode === 'dateAdded' ? 'Recent' : mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {!isSearching && renderBreadcrumb()}

      {showFlatBookList ? (
        <FlatList
          data={displayedBooks}
          keyExtractor={(b) => b.id}
          renderItem={({ item }) => <BookRow book={item} onPress={() => router.push(`/library/${item.id}`)} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={colors.border} />
              <Text style={styles.emptySubtitle}>
                {isSearching ? 'No books match your search.' : 'No books in this division yet.'}
              </Text>
            </View>
          }
        />
      ) : (
        renderClassificationBrowser()
      )}
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
        {book.section && (
          <Text style={styles.bookClass} numberOfLines={1}>
            {book.mainClass?.code} › {book.section?.code} › {book.division?.code}
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
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A0800', paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  headerTitle: { flex: 1, color: '#FFFFFF', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  addButton: { padding: spacing.xs },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, margin: spacing.md, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, fontSize: 16, color: colors.text },
  sortBar: { marginBottom: spacing.sm, maxHeight: 40 },
  sortBarContent: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm, alignItems: 'center' },
  sortChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  sortChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sortChipText: { fontSize: 13, color: colors.textSecondary },
  sortChipTextActive: { color: '#fff', fontWeight: '600' },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.primaryLight },
  breadcrumbText: { flex: 1, fontSize: 13, color: colors.primary, fontWeight: '500' },
  classRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, marginHorizontal: spacing.md, marginBottom: spacing.sm, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  classCode: { width: 52, height: 52, borderRadius: radius.sm, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  classCodeText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  classInfo: { flex: 1 },
  className: { fontSize: 16, fontWeight: '600', color: colors.text },
  classCount: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
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
