import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Modal, Image, ActivityIndicator, Switch,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../src/theme';
import { useAuth } from '../../src/contexts/AuthContext';
import { getMyLibraries, getBooksInLibrary, createLibrary, getFollowedLibraries } from '../../src/services/library';
import type { Library, LibraryBook, LibraryWithMeta } from '../../src/services/library';

type ShelfWithBooks = { library: Library; books: LibraryBook[] };
type FollowedShelfWithBooks = { library: LibraryWithMeta; books: LibraryBook[] };

const COVER_W = 67;
const COVER_H = 98;

// Deterministic cover background color from title
const SPINE_COLORS = ['#4C703E', '#C5612A', '#2D4A2B', '#7A5C3E', '#3B5998', '#6B4C8A'];
function spineColor(title: string): string {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = ((h << 5) - h + title.charCodeAt(i)) | 0;
  return SPINE_COLORS[Math.abs(h) % SPINE_COLORS.length];
}

function BookCover({ book, onPress }: { book: LibraryBook; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.coverWrap} onPress={onPress} activeOpacity={0.75}>
      {book.coverImage ? (
        <Image source={{ uri: book.coverImage }} style={styles.cover} resizeMode="cover" />
      ) : (
        <View style={[styles.cover, { backgroundColor: spineColor(book.title) }]}>
          <View style={styles.spineAccent} />
          <Text style={styles.spineTitleText} numberOfLines={4}>{book.title}</Text>
        </View>
      )}
      {book.isOnLoan && (
        <View style={styles.outBadge}>
          <Text style={styles.outBadgeText}>OUT</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function MyShelvesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [shelves, setShelves] = useState<ShelfWithBooks[]>([]);
  const [followedShelves, setFollowedShelves] = useState<FollowedShelfWithBooks[]>([]);
  const [loading, setLoading] = useState(true);
  const [createVisible, setCreateVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPublic, setNewPublic] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user) { setLoading(false); return; }
      load();
    }, [user])
  );

  async function load() {
    setLoading(true);
    try {
      const [libs, followed] = await Promise.all([getMyLibraries(), getFollowedLibraries()]);
      const [myBooks, followedBooks] = await Promise.all([
        Promise.all(libs.map((lib) => getBooksInLibrary(lib.id))),
        Promise.all(followed.map((lib) => getBooksInLibrary(lib.id))),
      ]);
      setShelves(libs.map((lib, i) => ({ library: lib, books: myBooks[i] })));
      setFollowedShelves(followed.map((lib, i) => ({ library: lib, books: followedBooks[i] })));
    } catch {
      setShelves([]);
      setFollowedShelves([]);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setNewName('');
    setNewDesc('');
    setNewPublic(true);
    setCreateVisible(true);
  }

  async function handleCreate() {
    if (!newName.trim()) {
      Alert.alert('Name Required', 'Enter a name for your shelf.');
      return;
    }
    setSaving(true);
    try {
      await createLibrary(newName.trim(), newDesc.trim() || null, newPublic);
      setCreateVisible(false);
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
      <View style={styles.headerRow}>
        <Text style={styles.title}>Shelves</Text>
        <TouchableOpacity onPress={openCreate} style={{ padding: spacing.xs }}>
          <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : shelves.length === 0 && followedShelves.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="library-outline" size={64} color={colors.border} />
          <Text style={styles.emptyTitle}>No shelves yet</Text>
          <Text style={styles.emptySubtitle}>Create your first shelf to share your collection.</Text>
          <TouchableOpacity style={styles.createBigBtn} onPress={openCreate}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.createBigBtnText}>New Shelf</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.sectionDivider}>
            <Text style={styles.sectionDividerLabel}>My Shelves</Text>
            <View style={styles.sectionDividerLine} />
          </View>
          {shelves.map(({ library, books }) => (
            <View key={library.id} style={styles.shelfSection}>
              <TouchableOpacity
                style={styles.shelfHeader}
                onPress={() => router.push(`/shelves/${library.id}`)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.shelfName}>{library.name}</Text>
                  <Text style={styles.shelfMeta}>
                    {books.length} {books.length === 1 ? 'book' : 'books'}
                    {' · '}
                    {library.isPublic ? 'Public' : 'Private'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.borderDark} />
              </TouchableOpacity>

              {books.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.rail}
                >
                  {books.map((book) => (
                    <BookCover
                      key={book.id}
                      book={book}
                      onPress={() => router.push(`/library/${book.copyId}`)}
                    />
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.emptyRail}>
                  <Ionicons name="book-outline" size={22} color={colors.border} />
                  <Text style={styles.emptyRailText}>Add books from the Library tab</Text>
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity style={styles.newShelfRow} onPress={openCreate}>
            <Ionicons name="add" size={18} color={colors.primary} />
            <Text style={styles.newShelfRowText}>New Shelf</Text>
          </TouchableOpacity>

          {followedShelves.length > 0 && (
            <>
              <View style={[styles.sectionDivider, { marginTop: spacing.sm }]}>
                <Text style={styles.sectionDividerLabel}>Following</Text>
                <View style={styles.sectionDividerLine} />
              </View>
              {followedShelves.map(({ library, books }) => (
                <View key={library.id} style={styles.shelfSection}>
                  <TouchableOpacity
                    style={styles.shelfHeader}
                    onPress={() => router.push(`/library/view/${library.id}`)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7 }}>
                        <Text style={styles.shelfName}>{library.name}</Text>
                        <Text style={styles.shelfOwner}>{library.ownerDisplayName}</Text>
                      </View>
                      <Text style={styles.shelfMeta}>{books.length} {books.length === 1 ? 'book' : 'books'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.borderDark} />
                  </TouchableOpacity>
                  {books.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
                      {books.map((book) => (
                        <BookCover key={book.id} book={book} onPress={() => router.push(`/library/view/${library.id}`)} />
                      ))}
                    </ScrollView>
                  ) : (
                    <View style={styles.emptyRail}>
                      <Ionicons name="book-outline" size={22} color={colors.border} />
                      <Text style={styles.emptyRailText}>No books yet</Text>
                    </View>
                  )}
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* Create shelf modal */}
      <Modal visible={createVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setCreateVisible(false)}>
              <Text style={styles.modalAction}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Shelf</Text>
            <TouchableOpacity onPress={handleCreate}>
              <Text style={[styles.modalAction, { color: colors.primaryDark, fontWeight: '700' }]}>Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalForm}>
            <View style={styles.fieldCard}>
              <Text style={styles.fieldLabel}>Shelf Name</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. Favorites, Science Fiction, Lendables…"
                value={newName}
                onChangeText={setNewName}
                autoFocus
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.fieldCard}>
              <Text style={styles.fieldLabel}>
                Description <Text style={styles.optional}>· optional</Text>
              </Text>
              <TextInput
                style={[styles.fieldInput, { minHeight: 60 }]}
                placeholder="A short description of your shelf…"
                value={newDesc}
                onChangeText={setNewDesc}
                multiline
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={[styles.fieldCard, { flexDirection: 'row', alignItems: 'center' }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Public Shelf</Text>
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
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleCreate}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Create Shelf</Text>}
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
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 6, paddingBottom: 4 },
  title: { fontSize: 34, fontWeight: '600', color: colors.text, letterSpacing: -0.3, fontFamily: 'Georgia' },

  scrollContent: { paddingBottom: spacing.xl },

  shelfSection: { marginBottom: spacing.lg },
  shelfHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  sectionDivider: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: spacing.md, paddingTop: 11, paddingBottom: 4 },
  sectionDividerLabel: { fontFamily: 'Courier', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.primaryDark },
  sectionDividerLine: { flex: 1, height: 1, backgroundColor: colors.borderCard },
  shelfName: { fontSize: 17, fontWeight: '600', color: colors.text, fontFamily: 'Georgia' },
  shelfMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  shelfOwner: { fontSize: 12, color: colors.textSecondary },

  rail: { paddingHorizontal: spacing.md, gap: spacing.sm, paddingBottom: spacing.xs },

  coverWrap: { position: 'relative' },
  cover: { width: COVER_W, height: COVER_H, borderRadius: 6, overflow: 'hidden' },
  spineAccent: { position: 'absolute', left: 6, top: 0, bottom: 0, width: 1.5, backgroundColor: 'rgba(255,255,255,0.25)' },
  spineTitleText: { position: 'absolute', inset: 0, padding: 7, paddingLeft: 12, fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.85)', lineHeight: 12 },
  outBadge: { position: 'absolute', top: 5, right: 5, backgroundColor: colors.onLoan, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  outBadgeText: { color: '#fff', fontSize: 8, fontWeight: '800', letterSpacing: 0.3 },

  emptyRail: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 18, backgroundColor: colors.surfaceAlt, borderRadius: 12, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  emptyRailText: { fontSize: 13, color: colors.textMuted },

  newShelfRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginHorizontal: spacing.md, paddingVertical: 14, borderWidth: 1, borderColor: colors.primary, borderRadius: 12 },
  newShelfRowText: { color: colors.primary, fontWeight: '600', fontSize: 15 },

  createBigBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginTop: spacing.lg },
  createBigBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Modal
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderColor: colors.border },
  modalAction: { fontSize: 16, color: colors.primary },
  modalTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  modalForm: { padding: spacing.md, gap: spacing.sm },
  fieldCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 13 },
  fieldLabel: { fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  fieldInput: { fontSize: 15, color: colors.text, marginTop: 3, padding: 0 },
  optional: { textTransform: 'none', letterSpacing: 0, color: colors.borderDark },
  switchHint: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 11, padding: 14, alignItems: 'center', marginTop: spacing.sm },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
