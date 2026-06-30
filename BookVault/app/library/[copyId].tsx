import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, Alert, TextInput, Modal, FlatList, Platform, StatusBar,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../src/theme';
import { CommunityRatings } from '../../src/components/CommunityRatings';
import { getCopyById, updateBookCopy, deleteBookCopy, getRecordCopySummary } from '../../src/database/queries/books';
import { getLoanHistoryForCopy, createLoan, returnLoan } from '../../src/database/queries/loans';
import { getAllContacts, createContact } from '../../src/database/queries/contacts';
import { getHoldsForRecord, addHold, removeHold } from '../../src/database/queries/holds';
import type { HoldWithContact } from '../../src/database/queries/holds';
import {
  updateBookLoanStatus, getMyLibraries, getLibraryIdsForCopy,
  upsertBookInLibrary, removeBookFromLibrary,
} from '../../src/services/library';
import type { Library } from '../../src/services/library';
import type { BookCopyWithDetails, LoanWithDetails, Contact } from '../../src/types';

export default function BookDetailScreen() {
  const { copyId } = useLocalSearchParams<{ copyId: string }>();
  const router = useRouter();
  const [book, setBook] = useState<BookCopyWithDetails | null>(null);
  const [loanHistory, setLoanHistory] = useState<LoanWithDetails[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [lendModalVisible, setLendModalVisible] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loanNotes, setLoanNotes] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [showNewContact, setShowNewContact] = useState(false);
  const [myLibraries, setMyLibraries] = useState<Library[]>([]);
  const [memberLibraryIds, setMemberLibraryIds] = useState<string[]>([]);
  const [copySummary, setCopySummary] = useState<{ total: number; available: number } | null>(null);
  const [holds, setHolds] = useState<HoldWithContact[]>([]);
  const [holdModalVisible, setHoldModalVisible] = useState(false);
  const [holdContactSearch, setHoldContactSearch] = useState('');
  const [holdContacts, setHoldContacts] = useState<Contact[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [copyId])
  );

  function loadData() {
    if (!copyId) return;
    try {
      const data = getCopyById(copyId);
      setBook(data);
      setLoanHistory(getLoanHistoryForCopy(copyId));
      if (data) {
        setCopySummary(getRecordCopySummary(data.recordId));
        setHolds(getHoldsForRecord(data.recordId));
      }
    } catch {
      // SQLite error — leave book null, screen shows "not found"
    }
    getMyLibraries().then(setMyLibraries).catch(() => {});
    getLibraryIdsForCopy(copyId).then(setMemberLibraryIds).catch(() => {});
  }

  function handleRating(star: number) {
    if (!book) return;
    const newRating = book.personalRating === star ? null : star;
    updateBookCopy(book.id, { personalRating: newRating });
    setBook((prev) => prev ? { ...prev, personalRating: newRating } : prev);
  }

  function handleReturnBook() {
    if (!book?.currentLoan) return;
    Alert.alert('Mark as Returned', `Return this book from ${book.currentLoan.contact.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Returned',
        onPress: () => {
          returnLoan(book.currentLoan!.id, new Date().toISOString());
          loadData();
          updateBookLoanStatus(book.id, false).catch(() => {});
        },
      },
    ]);
  }

  function handleLend() {
    setContacts(getAllContacts());
    setSelectedContact(holds.length > 0 ? holds[0].contact : null);
    setReturnDate(null);
    setShowDatePicker(false);
    setLoanNotes('');
    setShowNewContact(false);
    setNewContactName('');
    setLendModalVisible(true);
  }

  function confirmLend() {
    if (!book) return;
    let contactId = selectedContact?.id;

    if (showNewContact) {
      if (!newContactName.trim()) {
        Alert.alert('Name Required', 'Enter a name for the new contact.');
        return;
      }
      contactId = createContact({ name: newContactName.trim(), phone: null, email: null, notes: null, color: null });
    }

    if (!contactId) {
      Alert.alert('Select Contact', 'Choose who you are lending to.');
      return;
    }

    const returnIso = returnDate ? returnDate.toISOString().split('T')[0] : null;
    createLoan(book.id, contactId, new Date().toISOString(), returnIso, loanNotes.trim() || null);
    if (holds.length > 0 && holds[0].contactId === contactId) {
      removeHold(holds[0].id);
    }
    setLendModalVisible(false);
    loadData();
    updateBookLoanStatus(book.id, true).catch(() => {});
  }

  async function handleLibraryToggle(lib: Library) {
    if (!book) return;
    const inLibrary = memberLibraryIds.includes(lib.id);
    if (inLibrary) {
      await removeBookFromLibrary(lib.id, book.id).catch(() => {});
      setMemberLibraryIds((prev) => prev.filter((id) => id !== lib.id));
    } else {
      const isbn = book.record.isbn13;
      const coverImage = isbn
        ? `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`
        : null;
      await upsertBookInLibrary(lib.id, {
        copyId: book.id,
        recordId: book.record.id,
        title: book.record.title,
        authors: book.record.authors,
        sortAuthor: book.record.sortAuthor,
        isbn13: isbn,
        publisher: book.record.publisher,
        publishedYear: book.record.publishedYear,
        pageCount: book.record.pageCount,
        synopsis: book.record.synopsis,
        coverImage,
        deweyDecimal: book.record.deweyDecimal,
        copyNumber: book.copyNumber,
        divisionCode: book.division?.code ?? null,
        divisionName: book.division?.name ?? null,
        sectionCode: book.section?.code ?? null,
        sectionName: book.section?.name ?? null,
        mainClassCode: book.mainClass?.code ?? null,
        mainClassName: book.mainClass?.name ?? null,
        isOnLoan: book.isOnLoan,
      }).catch(() => {});
      setMemberLibraryIds((prev) => [...prev, lib.id]);
    }
  }

  function handleDelete() {
    if (!book) return;
    if (book.isOnLoan) {
      Alert.alert('Cannot Delete', 'This copy is currently on loan. Return it before deleting.');
      return;
    }
    Alert.alert('Delete Copy', 'Delete this copy? If it is the last copy, the book record will also be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          try {
            deleteBookCopy(book.id);
            router.back();
          } catch {
            Alert.alert('Error', 'Could not delete this copy. Please try again.');
          }
        },
      },
    ]);
  }

  function openHoldModal() {
    setHoldContacts(getAllContacts());
    setHoldContactSearch('');
    setHoldModalVisible(true);
  }

  if (!book) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><Text style={styles.notFound}>Book not found.</Text></View>
      </SafeAreaView>
    );
  }

  const pastLoans = loanHistory.filter((l) => l.dateReturned !== null);
  const coverBg = spineColor(book.record.title);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.heroRow}>
          {book.record.coverImage ? (
            <Image source={{ uri: book.record.coverImage }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, { backgroundColor: coverBg }]}>
              <View style={styles.coverInsetBorder} />
              <Text style={styles.coverPlaceholderTitle} numberOfLines={5}>{book.record.title}</Text>
            </View>
          )}
          <View style={styles.heroInfo}>
            <Text style={styles.title}>{book.record.title}</Text>
            <Text style={styles.authors}>{book.record.authors.join(', ')}</Text>
            {book.record.publisher && (
              <Text style={styles.meta}>{book.record.publisher}{book.record.publishedYear ? ` · ${book.record.publishedYear}` : ''}</Text>
            )}
            {book.record.pageCount && <Text style={styles.meta}>{book.record.pageCount} pages</Text>}
            {book.copyNumber > 1 && <Text style={styles.copyLabel}>Copy {book.copyNumber}</Text>}
          </View>
        </View>

        {book.division && (
          <View style={styles.classCard}>
            <Ionicons name="layers-outline" size={16} color={colors.primary} />
            <Text style={styles.classText} numberOfLines={2}>
              {book.mainClass?.code} {book.mainClass?.name} › {book.section?.code} {book.section?.name} › {book.division.code} {book.division.name}
            </Text>
          </View>
        )}

        {copySummary && copySummary.total > 1 && (
          <View style={[
            styles.availBanner,
            copySummary.available === 0 ? styles.availBannerOut : styles.availBannerOk,
          ]}>
            <View style={{ flex: 1 }}>
              <Text style={[
                styles.availBannerText,
                { color: copySummary.available === 0 ? colors.danger : colors.accentDark },
              ]}>
                {copySummary.available === 0
                  ? 'All copies out on loan'
                  : `${copySummary.available} cop${copySummary.available === 1 ? 'y' : 'ies'} available`}
              </Text>
            </View>
            <View style={styles.dotsRow}>
              {Array.from({ length: copySummary.total }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, { backgroundColor: i < (copySummary.total - copySummary.available) ? colors.danger : colors.success }]}
                />
              ))}
            </View>
            <Text style={styles.dotLabel}>{copySummary.total - copySummary.available} of {copySummary.total} out</Text>
          </View>
        )}

        {book.isOnLoan && book.currentLoan && (
          <View style={[styles.loanCard, book.currentLoan.isOverdue && styles.loanCardOverdue]}>
            <View style={styles.loanCardHeader}>
              <Ionicons name="swap-horizontal" size={18} color={book.currentLoan.isOverdue ? colors.danger : colors.onLoan} />
              <Text style={[styles.loanCardTitle, book.currentLoan.isOverdue && { color: colors.danger }]}>
                {book.currentLoan.isOverdue ? 'OVERDUE — On Loan' : 'Currently On Loan'}
              </Text>
            </View>
            <Text style={styles.loanDetail}>To: <Text style={styles.loanDetailBold}>{book.currentLoan.contact.name}</Text></Text>
            <Text style={styles.loanDetail}>Since: {formatDate(book.currentLoan.dateLent)}</Text>
            {book.currentLoan.expectedReturn && (
              <Text style={styles.loanDetail}>Due: {formatDate(book.currentLoan.expectedReturn)}</Text>
            )}
            <TouchableOpacity style={styles.returnBtn} onPress={handleReturnBook}>
              <Text style={styles.returnBtnText}>Mark as Returned</Text>
            </TouchableOpacity>
          </View>
        )}

        {book.isOnLoan ? (
          <View style={{ gap: spacing.sm }}>
            <View style={styles.lendBtnDisabled}>
              <Ionicons name="time-outline" size={20} color={colors.textMuted} />
              <Text style={styles.lendBtnDisabledText}>Unavailable to Lend</Text>
            </View>
            <TouchableOpacity style={styles.waitlistRow} onPress={openHoldModal}>
              <Ionicons name="person-add-outline" size={17} color={colors.primary} />
              <Text style={styles.waitlistText}>
                {holds.length > 0
                  ? `${holds.length} on waitlist · Manage`
                  : 'Add to waitlist'}
              </Text>
              <Ionicons name="chevron-forward" size={15} color={colors.primaryDark} />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {holds.length > 0 && (
              <View style={styles.nextInQueueBanner}>
                <Ionicons name="list-outline" size={15} color={colors.primary} />
                <Text style={styles.nextInQueueText}>
                  {holds.length} patron{holds.length > 1 ? 's' : ''} on waitlist · {holds[0].contact.name} is next
                </Text>
                <TouchableOpacity onPress={openHoldModal}>
                  <Text style={[styles.nextInQueueText, { textDecorationLine: 'underline' }]}>Manage</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={styles.lendBtn} onPress={handleLend}>
              <Ionicons name="swap-horizontal-outline" size={20} color="#fff" />
              <Text style={styles.lendBtnText}>Lend This Book</Text>
            </TouchableOpacity>
          </>
        )}

        {book.record.isbn13 ? (
          <View style={styles.section}>
            <CommunityRatings
              isbn={book.record.isbn13}
              localRating={book.personalRating}
              onLocalRating={(star) => handleRating(star)}
            />
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Rating</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => handleRating(star)}>
                  <Ionicons
                    name={star <= (book.personalRating ?? 0) ? 'star' : 'star-outline'}
                    size={32}
                    color={star <= (book.personalRating ?? 0) ? colors.stars : colors.border}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {book.record.synopsis && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Synopsis</Text>
            <Text style={styles.synopsis}>{book.record.synopsis}</Text>
          </View>
        )}

        {pastLoans.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.historyToggle} onPress={() => setHistoryExpanded((v) => !v)}>
              <Text style={styles.sectionTitle}>Loan History ({pastLoans.length})</Text>
              <Ionicons name={historyExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            {historyExpanded && pastLoans.map((loan) => (
              <View key={loan.id} style={styles.historyRow}>
                <Text style={styles.historyName}>{loan.contact.name}</Text>
                <Text style={styles.historyDates}>{formatDate(loan.dateLent)} – {loan.dateReturned ? formatDate(loan.dateReturned) : 'Not returned'}</Text>
              </View>
            ))}
          </View>
        )}

        {myLibraries.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shelves</Text>
            <View style={styles.libraryChips}>
              {myLibraries.map((lib) => {
                const inLibrary = memberLibraryIds.includes(lib.id);
                return (
                  <TouchableOpacity
                    key={lib.id}
                    style={[styles.libraryChip, inLibrary && styles.libraryChipActive]}
                    onPress={() => handleLibraryToggle(lib)}
                  >
                    <Ionicons
                      name={inLibrary ? 'checkmark-circle' : 'library-outline'}
                      size={14}
                      color={inLibrary ? '#fff' : colors.primary}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.libraryChipText, inLibrary && styles.libraryChipTextActive]}>
                      {lib.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={styles.deleteBtnText}>Delete This Copy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={holdModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Waitlist</Text>
            <TouchableOpacity onPress={() => setHoldModalVisible(false)}>
              <Ionicons name="close" size={26} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }} keyboardShouldPersistTaps="handled">
            {holds.length > 0 ? (
              <View style={{ gap: spacing.xs }}>
                <Text style={styles.fieldLabel}>Queue</Text>
                {holds.map((hold, i) => (
                  <View key={hold.id} style={styles.holdRow}>
                    <View style={styles.holdPosition}>
                      <Text style={styles.holdPositionText}>#{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.holdName}>{hold.contact.name}</Text>
                      <Text style={styles.holdDate}>Added {formatDate(hold.requestedAt)}</Text>
                    </View>
                    <TouchableOpacity
                      hitSlop={10}
                      onPress={() => {
                        removeHold(hold.id);
                        if (book) setHolds(getHoldsForRecord(book.recordId));
                      }}
                    >
                      <Ionicons name="trash-outline" size={19} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.holdEmptyState}>
                <Ionicons name="list-outline" size={38} color={colors.border} />
                <Text style={styles.holdEmptyText}>Nobody on the waitlist yet.</Text>
              </View>
            )}

            <View style={{ gap: spacing.sm }}>
              <Text style={styles.fieldLabel}>Add Patron</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Search contacts..."
                value={holdContactSearch}
                onChangeText={setHoldContactSearch}
                placeholderTextColor={colors.textSecondary}
                autoCorrect={false}
              />
              {holdContactSearch.length > 0 && (() => {
                const alreadyIn = new Set(holds.map((h) => h.contactId));
                const filtered = holdContacts.filter(
                  (c) => !alreadyIn.has(c.id) && c.name.toLowerCase().includes(holdContactSearch.toLowerCase())
                );
                return filtered.length > 0 ? filtered.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.contactRow}
                    onPress={() => {
                      if (book) {
                        addHold(book.recordId, c.id);
                        setHolds(getHoldsForRecord(book.recordId));
                        setHoldContactSearch('');
                      }
                    }}
                  >
                    <Ionicons name="person-outline" size={17} color={colors.primary} style={{ marginRight: spacing.sm }} />
                    <Text style={styles.contactName}>{c.name}</Text>
                    <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                  </TouchableOpacity>
                )) : (
                  <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.sm }}>
                    No contacts match "{holdContactSearch}"
                  </Text>
                );
              })()}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={lendModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Lend Book</Text>
            <TouchableOpacity onPress={() => setLendModalVisible(false)}>
              <Ionicons name="close" size={26} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
            {holds.length > 0 && (
              <View style={styles.nextInQueueBanner}>
                <Ionicons name="list-outline" size={15} color={colors.primary} />
                <Text style={styles.nextInQueueText}>
                  Next on waitlist: <Text style={{ fontWeight: '700' }}>{holds[0].contact.name}</Text>
                  {holds.length > 1 ? ` (+${holds.length - 1} more)` : ''}
                </Text>
              </View>
            )}
            <Text style={styles.fieldLabel}>Lending to</Text>
            <FlatList
              scrollEnabled={false}
              data={contacts}
              keyExtractor={(c) => c.id}
              renderItem={({ item: c }) => (
                <TouchableOpacity
                  style={[styles.contactRow, selectedContact?.id === c.id && styles.contactRowSelected]}
                  onPress={() => { setSelectedContact(c); setShowNewContact(false); }}
                >
                  <Text style={styles.contactName}>{c.name}</Text>
                  {selectedContact?.id === c.id && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </TouchableOpacity>
              )}
              ListFooterComponent={
                <TouchableOpacity style={[styles.contactRow, showNewContact && styles.contactRowSelected]} onPress={() => { setShowNewContact(true); setSelectedContact(null); }}>
                  <Ionicons name="person-add-outline" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
                  <Text style={[styles.contactName, { color: colors.primary }]}>New Patron</Text>
                </TouchableOpacity>
              }
            />
            {showNewContact && (
              <TextInput style={styles.modalInput} placeholder="Contact name" value={newContactName} onChangeText={setNewContactName} autoFocus placeholderTextColor={colors.textSecondary} />
            )}
            <Text style={styles.fieldLabel}>Expected Return Date (optional)</Text>
            <TouchableOpacity
              style={styles.dateTrigger}
              onPress={() => setShowDatePicker((v) => !v)}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={[styles.dateTriggerText, !returnDate && { color: colors.textSecondary }]}>
                {returnDate
                  ? returnDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
                  : 'No return date set'}
              </Text>
              {returnDate && (
                <TouchableOpacity onPress={() => { setReturnDate(null); setShowDatePicker(false); }}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={returnDate ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                textColor={colors.text}
                onChange={(_event, date) => {
                  if (Platform.OS === 'android') setShowDatePicker(false);
                  if (date) setReturnDate(date);
                }}
              />
            )}
            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput style={[styles.modalInput, { minHeight: 60 }]} placeholder="Any notes..." value={loanNotes} onChangeText={setLoanNotes} multiline placeholderTextColor={colors.textSecondary} />
            <TouchableOpacity style={styles.lendBtn} onPress={confirmLend}>
              <Text style={styles.lendBtnText}>Confirm Loan</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const SPINE_COLORS = ['#4C703E', '#C5612A', '#2D4A2B', '#7A5C3E', '#3B5998', '#6B4C8A'];
function spineColor(title: string): string {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = ((h << 5) - h + title.charCodeAt(i)) | 0;
  return SPINE_COLORS[Math.abs(h) % SPINE_COLORS.length];
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 16, color: colors.textSecondary },
  scroll: { padding: spacing.md, gap: spacing.md },
  heroRow: { flexDirection: 'row', gap: spacing.md },
  cover: { width: 92, height: 132, borderRadius: 8, overflow: 'hidden', position: 'relative', justifyContent: 'center', alignItems: 'center', padding: 10 },
  coverInsetBorder: { position: 'absolute', top: 6, left: 6, right: 6, bottom: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', borderRadius: 3 },
  coverPlaceholderTitle: { fontFamily: 'Georgia', fontWeight: '600', fontSize: 12, lineHeight: 16, color: 'rgba(250,243,224,0.96)', textAlign: 'center' },
  heroInfo: { flex: 1, gap: spacing.xs },
  title: { fontSize: 21, fontWeight: '700', color: colors.text, fontFamily: 'Georgia', lineHeight: 26 },
  authors: { fontSize: 14, color: colors.textSecondary },
  meta: { fontSize: 13, color: colors.textSecondary },
  copyLabel: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  classCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.md },
  classText: { flex: 1, fontSize: 13, color: colors.primary },
  availBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10, borderWidth: 1 },
  availBannerOk: { backgroundColor: '#EAF0DA', borderColor: '#CADBA8' },
  availBannerOut: { backgroundColor: '#FBE6E2', borderColor: '#EBC4BD' },
  availBannerText: { fontSize: 13, fontWeight: '600' },
  dotsRow: { flexDirection: 'row', gap: 3 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  dotLabel: { fontFamily: 'Courier', fontSize: 11, color: colors.textMuted },
  loanCard: { backgroundColor: '#FFF8E1', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.onLoan, gap: spacing.xs },
  loanCardOverdue: { backgroundColor: '#FFEBEE', borderColor: colors.danger },
  loanCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  loanCardTitle: { fontSize: 15, fontWeight: '700', color: colors.onLoan },
  loanDetail: { fontSize: 14, color: colors.text },
  loanDetailBold: { fontWeight: '700' },
  returnBtn: { marginTop: spacing.sm, backgroundColor: colors.success, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' },
  returnBtnText: { color: '#fff', fontWeight: '700' },
  lendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: 11, padding: 13 },
  lendBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  lendBtnDisabled: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.surfaceAlt, borderRadius: 11, padding: 13, borderWidth: 1, borderColor: colors.border },
  lendBtnDisabledText: { color: colors.textMuted, fontSize: 16, fontWeight: '700' },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, fontFamily: 'Georgia' },
  starsRow: { flexDirection: 'row', gap: spacing.sm },
  communityRating: { fontSize: 13, color: colors.textSecondary },
  synopsis: { fontSize: 14, color: colors.text, lineHeight: 21 },
  historyToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyRow: { paddingVertical: spacing.sm, borderTopWidth: 1, borderColor: colors.border },
  historyName: { fontSize: 14, fontWeight: '600', color: colors.text },
  historyDates: { fontSize: 12, color: colors.textSecondary },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center', padding: spacing.md, borderWidth: 1, borderColor: colors.danger, borderRadius: radius.md },
  deleteBtnText: { color: colors.danger, fontWeight: '600' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  modalInput: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 16, color: colors.text },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  contactRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border },
  contactRowSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  contactName: { flex: 1, fontSize: 16, color: colors.text },
  dateTrigger: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  dateTriggerText: { flex: 1, fontSize: 15, color: colors.text },
  libraryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  libraryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  libraryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  libraryChipText: { fontSize: 13, color: colors.primary, fontWeight: '500' },
  libraryChipTextActive: { color: '#fff' },
  waitlistRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 11, borderWidth: 1, borderColor: colors.primaryLight, backgroundColor: 'rgba(231,125,54,0.06)' },
  waitlistText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.primary },
  nextInQueueBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.primary, flexWrap: 'wrap' },
  nextInQueueText: { fontSize: 13, color: colors.primaryDark, fontWeight: '600' },
  holdRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surfaceCard, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.borderCard, marginBottom: spacing.xs },
  holdPosition: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  holdPositionText: { color: '#fff', fontSize: 12, fontWeight: '700', fontFamily: 'Courier' },
  holdName: { fontSize: 15, fontWeight: '600', color: colors.text, fontFamily: 'Georgia' },
  holdDate: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  holdEmptyState: { alignItems: 'center', paddingVertical: 30, gap: spacing.sm },
  holdEmptyText: { fontSize: 14, color: colors.textSecondary },
});
