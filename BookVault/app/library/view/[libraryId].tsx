import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Alert, Modal,
  TextInput, ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../../src/theme';
import { useAuth } from '../../../src/contexts/AuthContext';
import { AuthSheet } from '../../../src/components/AuthSheet';
import {
  getLibraryById, getBooksInLibrary, getMyCardForLibrary,
  applyForCard, createBookRequest,
} from '../../../src/services/library';
import type { Library, LibraryBook, LibraryCard } from '../../../src/services/library';
import { supabase } from '../../../src/lib/supabase';

export default function LibraryViewScreen() {
  const { libraryId } = useLocalSearchParams<{ libraryId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [library, setLibrary] = useState<Library | null>(null);
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [myCard, setMyCard] = useState<LibraryCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [authVisible, setAuthVisible] = useState(false);
  const [applyVisible, setApplyVisible] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');
  const [applying, setApplying] = useState(false);
  const [requestBook, setRequestBook] = useState<LibraryBook | null>(null);
  const [requestType, setRequestType] = useState<'checkout' | 'hold'>('checkout');
  const [requestNotes, setRequestNotes] = useState('');
  const [requesting, setRequesting] = useState(false);

  const isOwner = !!user && library?.ownerId === user.id;
  const isApproved = myCard?.status === 'approved';

  useEffect(() => {
    if (!libraryId || !user) return;
    async function refreshCard() {
      const card = await getMyCardForLibrary(libraryId!);
      setMyCard(card);
    }
    const channel = supabase
      .channel(`card-status-${libraryId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'library_cards', filter: `library_id=eq.${libraryId}` }, () => { refreshCard(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [libraryId, user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (!libraryId) return;
      load();
    }, [libraryId, user])
  );

  async function load() {
    setLoading(true);
    try {
      const [lib, bks, card] = await Promise.all([
        getLibraryById(libraryId!),
        getBooksInLibrary(libraryId!),
        getMyCardForLibrary(libraryId!),
      ]);
      setLibrary(lib);
      setBooks(bks);
      setMyCard(card);
    } catch {
      setLibrary(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleApply() {
    setApplying(true);
    try {
      await applyForCard(libraryId!, applyMessage.trim() || null);
      setApplyVisible(false);
      setApplyMessage('');
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not submit application.');
    } finally {
      setApplying(false);
    }
  }

  async function handleRequest() {
    if (!requestBook) return;
    setRequesting(true);
    try {
      await createBookRequest(libraryId!, requestBook.copyId, requestBook.title, requestType, requestNotes.trim() || null);
      setRequestBook(null);
      setRequestNotes('');
      Alert.alert('Request Sent', 'Your request has been sent to the library owner.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not send request.');
    } finally {
      setRequesting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (!library) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.notFound}>Shelf not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  function renderCardStatus() {
    if (isOwner) {
      return (
        <TouchableOpacity
          style={styles.ownerBanner}
          onPress={() => router.push(`/shelves/${libraryId}`)}
        >
          <Ionicons name="settings-outline" size={16} color={colors.primary} />
          <Text style={styles.ownerBannerText}>This is your shelf — tap to manage</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      );
    }
    if (!user) {
      return (
        <TouchableOpacity style={styles.applyBanner} onPress={() => setAuthVisible(true)}>
          <Ionicons name="person-outline" size={16} color={colors.primary} />
          <Text style={styles.applyBannerText}>Sign in to apply for a Shelf Card</Text>
        </TouchableOpacity>
      );
    }
    if (!myCard) {
      return (
        <TouchableOpacity style={styles.applyBanner} onPress={() => setApplyVisible(true)}>
          <Ionicons name="card-outline" size={16} color={colors.primary} />
          <Text style={styles.applyBannerText}>Apply for a Shelf Card</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      );
    }
    const statusMap: Record<string, { icon: string; color: string; text: string }> = {
      pending: { icon: 'time-outline', color: colors.warning, text: 'Application pending approval' },
      approved: { icon: 'checkmark-circle', color: colors.success, text: 'You have a Shelf Card' },
      denied: { icon: 'close-circle', color: colors.danger, text: 'Application was denied' },
    };
    const s = statusMap[myCard.status];
    return (
      <View style={[styles.statusBanner, { borderColor: s.color }]}>
        <Ionicons name={s.icon as any} size={16} color={s.color} />
        <Text style={[styles.statusBannerText, { color: s.color }]}>{s.text}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Stack.Screen options={{ title: library.name }} />

      <FlatList
        data={books}
        keyExtractor={(b) => b.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.libraryIcon}>
                <Ionicons name="library" size={28} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.libraryName}>{library.name}</Text>
                {library.description ? (
                  <Text style={styles.libraryDesc}>{library.description}</Text>
                ) : null}
              </View>
            </View>
            {renderCardStatus()}
          </View>
        }
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        renderItem={({ item }) => (
          <BookRow
            book={item}
            canRequest={isApproved && !isOwner}
            onPress={() => {
              if (isApproved && !isOwner) {
                setRequestBook(item);
                setRequestType(item.isOnLoan ? 'hold' : 'checkout');
                setRequestNotes('');
              }
            }}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="book-outline" size={48} color={colors.border} />
            <Text style={styles.emptyText}>No books in this shelf yet.</Text>
          </View>
        }
      />

      <AuthSheet visible={authVisible} onClose={() => setAuthVisible(false)} />

      <Modal visible={applyVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Apply for Shelf Card</Text>
            <TouchableOpacity onPress={() => { setApplyVisible(false); setApplyMessage(''); }}>
              <Ionicons name="close" size={26} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
            <Text style={styles.modalDesc}>
              Send a request to <Text style={{ fontWeight: '700' }}>{library.name}</Text> for a shelf card.
              The owner will review and approve or deny your request.
            </Text>
            <Text style={styles.fieldLabel}>Message to owner (optional)</Text>
            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              placeholder="Introduce yourself or explain your interest..."
              value={applyMessage}
              onChangeText={setApplyMessage}
              multiline
              placeholderTextColor={colors.textSecondary}
            />
            <TouchableOpacity
              style={[styles.primaryBtn, applying && { opacity: 0.6 }]}
              onPress={handleApply}
              disabled={applying}
            >
              {applying
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>Submit Application</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={!!requestBook} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Request Book</Text>
            <TouchableOpacity onPress={() => { setRequestBook(null); setRequestNotes(''); }}>
              <Ionicons name="close" size={26} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
            {requestBook && (
              <>
                <Text style={styles.requestTitle} numberOfLines={2}>{requestBook.title}</Text>
                {requestBook.isOnLoan && (
                  <View style={styles.onLoanNote}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
                    <Text style={styles.onLoanNoteText}>This book is currently on loan.</Text>
                  </View>
                )}
                <Text style={styles.fieldLabel}>Request type</Text>
                <View style={styles.typeRow}>
                  {(['checkout', 'hold'] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.typeChip, requestType === t && styles.typeChipActive]}
                      onPress={() => setRequestType(t)}
                    >
                      <Text style={[styles.typeChipText, requestType === t && styles.typeChipTextActive]}>
                        {t === 'checkout' ? 'Checkout' : 'Hold'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.fieldLabel}>Notes (optional)</Text>
                <TextInput
                  style={[styles.input, { minHeight: 60 }]}
                  placeholder="Any notes for the owner..."
                  value={requestNotes}
                  onChangeText={setRequestNotes}
                  multiline
                  placeholderTextColor={colors.textSecondary}
                />
                <TouchableOpacity
                  style={[styles.primaryBtn, requesting && { opacity: 0.6 }]}
                  onPress={handleRequest}
                  disabled={requesting}
                >
                  {requesting
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.primaryBtnText}>Send Request</Text>}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function BookRow({ book, canRequest, onPress }: { book: LibraryBook; canRequest: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.bookRow}
      onPress={onPress}
      activeOpacity={canRequest ? 0.7 : 1}
    >
      {book.coverImage ? (
        <Image source={{ uri: book.coverImage }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <Ionicons name="book-outline" size={24} color={colors.border} />
        </View>
      )}
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
        <Text style={styles.bookAuthor} numberOfLines={1}>{book.authors.join(', ')}</Text>
        {book.deweyDecimal && (
          <Text style={styles.bookClass}>{book.deweyDecimal}</Text>
        )}
      </View>
      <View style={styles.bookMeta}>
        {book.isOnLoan && (
          <View style={styles.onLoanBadge}>
            <Text style={styles.onLoanBadgeText}>Out</Text>
          </View>
        )}
        {canRequest && <Ionicons name="arrow-forward-circle-outline" size={20} color={colors.primary} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 16, color: colors.textSecondary },
  header: { padding: spacing.md, gap: spacing.md },
  headerTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  libraryIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  libraryName: { fontSize: 20, fontWeight: '700', color: colors.text },
  libraryDesc: { fontSize: 14, color: colors.textSecondary, marginTop: 4, lineHeight: 20 },
  ownerBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  ownerBannerText: { flex: 1, fontSize: 14, color: colors.primary, fontWeight: '600' },
  applyBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.primary },
  applyBannerText: { flex: 1, fontSize: 14, color: colors.primary, fontWeight: '600' },
  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, backgroundColor: colors.surface },
  statusBannerText: { flex: 1, fontSize: 14, fontWeight: '600' },
  bookRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.md, marginBottom: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, borderWidth: 1, borderColor: colors.border },
  cover: { width: 48, height: 68, borderRadius: radius.sm, marginRight: spacing.md },
  coverPlaceholder: { backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  bookInfo: { flex: 1 },
  bookTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  bookAuthor: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  bookClass: { fontSize: 11, color: colors.primary, marginTop: 2 },
  bookMeta: { alignItems: 'flex-end', gap: spacing.xs },
  onLoanBadge: { backgroundColor: colors.onLoan, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  onLoanBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: spacing.xl },
  emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  modalDesc: { fontSize: 14, color: colors.text, lineHeight: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 15, color: colors.text },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  requestTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  onLoanNote: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#FFF8E1', borderRadius: radius.sm, padding: spacing.sm, borderWidth: 1, borderColor: colors.warning },
  onLoanNoteText: { fontSize: 13, color: colors.warning, fontWeight: '600' },
  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeChip: { flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeChipText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  typeChipTextActive: { color: '#fff' },
});
