import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity, StyleSheet,
  Alert, TextInput, Share, ActivityIndicator, Modal, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, spacing, radius } from '../../src/theme';
import { getContactById, updateContact, deleteContact } from '../../src/database/queries/contacts';
import { getLoanHistoryForContact, createLoan, returnLoan } from '../../src/database/queries/loans';
import { getAllCopies } from '../../src/database/queries/books';
import { getMyLibraries, createInvite, updateBookLoanStatus } from '../../src/services/library';
import type { Library } from '../../src/services/library';
import type { Contact, LoanWithDetails, BookCopyWithDetails } from '../../src/types';

// ── Shared helpers ───────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#4C703E', '#C5612A', '#85AF3C', '#B04040', '#2D4A2B', '#7A8C6E'];

function getAvatarColor(id: string, stored?: string | null): string {
  if (stored) return stored;
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function duePill(loan: LoanWithDetails): { label: string; bg: string; color: string } {
  if (loan.isOverdue) return { label: 'Overdue', bg: '#F6E0E0', color: colors.danger };
  if (loan.expectedReturn) {
    const d = Math.ceil((new Date(loan.expectedReturn).getTime() - Date.now()) / 86400000);
    if (d <= 3) return { label: `Due in ${d}d`, bg: '#FCEAD2', color: colors.primaryDark };
    return { label: `Due ${new Date(loan.expectedReturn).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`, bg: '#EAF0DA', color: colors.accentDark };
  }
  const d = Math.floor((Date.now() - new Date(loan.dateLent).getTime()) / 86400000);
  return { label: `${d}d out`, bg: '#EAF0DA', color: colors.accentDark };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function ContactDetailScreen() {
  const { contactId } = useLocalSearchParams<{ contactId: string }>();
  const router = useRouter();

  const [contact, setContact] = useState<Contact | null>(null);
  const [loans, setLoans] = useState<LoanWithDetails[]>([]);
  const [myLibraries, setMyLibraries] = useState<Library[]>([]);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editColor, setEditColor] = useState<string>(AVATAR_COLORS[0]);

  // Lend modal state
  const [lendVisible, setLendVisible] = useState(false);
  const [availableBooks, setAvailableBooks] = useState<BookCopyWithDetails[]>([]);
  const [bookSearch, setBookSearch] = useState('');
  const [selectedBook, setSelectedBook] = useState<BookCopyWithDetails | null>(null);
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [lendNotes, setLendNotes] = useState('');
  const [lending, setLending] = useState(false);

  useFocusEffect(useCallback(() => { loadData(); }, [contactId]));

  function loadData() {
    if (!contactId) return;
    const c = getContactById(contactId);
    setContact(c);
    setLoans(getLoanHistoryForContact(contactId));
    getMyLibraries().then(setMyLibraries).catch(() => {});
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  function startEdit() {
    if (!contact) return;
    setEditName(contact.name);
    setEditPhone(contact.phone ?? '');
    setEditEmail(contact.email ?? '');
    setEditColor(getAvatarColor(contact.id, contact.color));
    setEditing(true);
  }

  function saveEdit() {
    if (!contact || !editName.trim()) {
      Alert.alert('Name Required', 'Please enter a name.');
      return;
    }
    updateContact(contact.id, {
      name: editName.trim(),
      phone: editPhone.trim() || null,
      email: editEmail.trim() || null,
      color: editColor,
    });
    loadData();
    setEditing(false);
  }

  // ── Lend flow ─────────────────────────────────────────────────────────────

  function openLendModal() {
    const books = getAllCopies().filter((b) => !b.isOnLoan);
    setAvailableBooks(books);
    setBookSearch('');
    setSelectedBook(null);
    setReturnDate(null);
    setShowDatePicker(false);
    setLendNotes('');
    setLendVisible(true);
  }

  const filteredBooks = useMemo(() => {
    if (!bookSearch.trim()) return availableBooks;
    const q = bookSearch.toLowerCase();
    return availableBooks.filter(
      (b) =>
        b.record.title.toLowerCase().includes(q) ||
        b.record.authors.some((a) => a.toLowerCase().includes(q))
    );
  }, [availableBooks, bookSearch]);

  async function confirmLend() {
    if (!contact || !selectedBook) {
      Alert.alert('Select a Book', 'Choose a book to lend.');
      return;
    }
    setLending(true);
    try {
      const returnIso = returnDate ? returnDate.toISOString().split('T')[0] : null;
      createLoan(selectedBook.id, contact.id, new Date().toISOString(), returnIso, lendNotes.trim() || null);
      await updateBookLoanStatus(selectedBook.id, true).catch(() => {});
      setLendVisible(false);
      loadData();
    } finally {
      setLending(false);
    }
  }

  // ── Return from patron detail ─────────────────────────────────────────────

  function handleReturn(loan: LoanWithDetails) {
    Alert.alert(
      'Mark as Returned',
      `Return "${loan.bookRecord.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Returned',
          onPress: () => {
            returnLoan(loan.id, new Date().toISOString());
            updateBookLoanStatus(loan.copyId, false).catch(() => {});
            loadData();
          },
        },
      ]
    );
  }

  // ── Shelf invite ──────────────────────────────────────────────────────────

  async function handleInvite(lib: Library) {
    setInvitingId(lib.id);
    try {
      const inv = await createInvite(lib.id);
      if (!inv?.inviteToken) throw new Error();
      const link = `bookvault://library/invite/${inv.inviteToken}`;
      await Share.share({
        message: `${contact?.name ?? 'You'} — you're invited to ${lib.name} on BookVault!\n\n${link}`,
        title: `Invite to ${lib.name}`,
      });
    } catch {
      Alert.alert('Error', 'Could not create invite link.');
    } finally {
      setInvitingId(null);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  function handleDelete() {
    if (!contact) return;
    const active = loans.filter((l) => !l.dateReturned);
    if (active.length > 0) {
      Alert.alert('Cannot Delete', 'This patron has books on loan. Return them first.');
      return;
    }
    Alert.alert('Delete Patron', `Delete ${contact.name}? Their loan history will also be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteContact(contact.id); router.back(); } },
    ]);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!contact) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><Text style={styles.notFound}>Patron not found.</Text></View>
      </SafeAreaView>
    );
  }

  const activeLoans = loans.filter((l) => !l.dateReturned);
  const pastLoans = loans.filter((l) => l.dateReturned);
  const onTimeCount = pastLoans.filter(
    (l) => !l.expectedReturn || !l.dateReturned || new Date(l.dateReturned) <= new Date(l.expectedReturn)
  ).length;
  const onTimePct = pastLoans.length > 0 ? Math.round((onTimeCount / pastLoans.length) * 100) : 100;
  const avatarColor = getAvatarColor(contact.id, contact.color);
  const firstName = contact.name.split(' ')[0];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Profile header ── */}
        {editing ? (
          <View style={styles.editCard}>
            {/* Avatar preview + color picker */}
            <View style={styles.editAvatarRow}>
              <View style={[styles.avatarLg, { backgroundColor: editColor }]}>
                <Text style={styles.avatarLgText}>{getInitials(editName || contact.name)}</Text>
              </View>
              <View style={styles.colorPicker}>
                {AVATAR_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorDot, { backgroundColor: c }, editColor === c && styles.colorDotActive]}
                    onPress={() => setEditColor(c)}
                  />
                ))}
              </View>
            </View>
            <View style={styles.fieldCard}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                style={styles.fieldInput}
                value={editName}
                onChangeText={setEditName}
                autoFocus
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.fieldCard}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.fieldInput}
                value={editEmail}
                onChangeText={setEditEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="Add email"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.fieldCard}>
              <Text style={styles.fieldLabel}>Phone <Text style={styles.optional}>· optional</Text></Text>
              <TextInput
                style={styles.fieldInput}
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
                placeholder="Add phone number"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.editBtnRow}>
              <TouchableOpacity style={styles.saveBtnInline} onPress={saveEdit}>
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtnInline} onPress={() => setEditing(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.profileCenter}>
            <View style={[styles.avatarLg, { backgroundColor: avatarColor }]}>
              <Text style={styles.avatarLgText}>{getInitials(contact.name)}</Text>
            </View>
            <Text style={styles.contactName}>{contact.name}</Text>
            {contact.email && (
              <View style={styles.metaRow}>
                <Ionicons name="mail-outline" size={13} color={colors.textMuted} />
                <Text style={styles.metaText}>{contact.email}</Text>
              </View>
            )}
            {contact.phone && (
              <View style={styles.metaRow}>
                <Ionicons name="call-outline" size={13} color={colors.textMuted} />
                <Text style={styles.metaText}>{contact.phone}</Text>
              </View>
            )}
            {contact.createdAt && (
              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                <Text style={styles.metaText}>Patron since {new Date(contact.createdAt).getFullYear()}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.editChip} onPress={startEdit}>
              <Ionicons name="pencil-outline" size={14} color={colors.primary} />
              <Text style={styles.editChipText}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Stats bar ── */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: activeLoans.length > 0 ? colors.onLoan : colors.text }]}>
              {activeLoans.length}
            </Text>
            <Text style={styles.statLabel}>Books out</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.text }]}>{loans.length}</Text>
            <Text style={styles.statLabel}>All-time</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.accentDark }]}>{onTimePct}%</Text>
            <Text style={styles.statLabel}>On time</Text>
          </View>
        </View>

        {/* ── Lend CTA ── */}
        <TouchableOpacity style={styles.lendBtn} onPress={openLendModal}>
          <Ionicons name="swap-horizontal" size={19} color="#fff" />
          <Text style={styles.lendBtnText}>Lend a Book to {firstName}</Text>
        </TouchableOpacity>

        {/* ── Currently Out ── */}
        {activeLoans.length > 0 && (
          <View style={styles.section}>
            <SectionDivider label="Currently Out" />
            {activeLoans.map((loan) => {
              const pill = duePill(loan);
              return (
                <TouchableOpacity
                  key={loan.id}
                  style={styles.loanCard}
                  onPress={() => router.push(`/library/${loan.copyId}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.spineCover} />
                  <View style={styles.loanInfo}>
                    <Text style={styles.loanTitle} numberOfLines={1}>{loan.bookRecord.title}</Text>
                    <Text style={styles.loanMeta} numberOfLines={1}>
                      {loan.bookRecord.authors[0] ?? ''}
                    </Text>
                    <Text style={styles.loanDate}>Lent by You · {formatDate(loan.dateLent)}</Text>
                  </View>
                  <View style={styles.loanRight}>
                    <View style={[styles.pill, { backgroundColor: pill.bg }]}>
                      <Text style={[styles.pillText, { color: pill.color }]}>{pill.label}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.returnChip}
                      onPress={() => handleReturn(loan)}
                    >
                      <Text style={styles.returnChipText}>Return</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Past Loans ── */}
        {pastLoans.length > 0 && (
          <View style={styles.section}>
            <SectionDivider label={`Past Loans (${pastLoans.length})`} />
            {pastLoans.map((loan) => {
              const onTime =
                !loan.expectedReturn ||
                !loan.dateReturned ||
                new Date(loan.dateReturned) <= new Date(loan.expectedReturn);
              return (
                <TouchableOpacity
                  key={loan.id}
                  style={styles.pastRow}
                  onPress={() => router.push(`/library/${loan.copyId}`)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.pastDot, { backgroundColor: onTime ? colors.accentDark : colors.danger }]} />
                  <View style={styles.pastInfo}>
                    <Text style={styles.pastTitle} numberOfLines={1}>{loan.bookRecord.title}</Text>
                    <Text style={styles.pastMeta}>
                      Returned {formatDate(loan.dateReturned!)}
                    </Text>
                  </View>
                  <Text style={[styles.pastBadge, { color: onTime ? colors.accentDark : colors.danger }]}>
                    {onTime ? 'On time' : 'Late'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Invite to Shelf ── */}
        {myLibraries.length > 0 && (
          <View style={styles.section}>
            <SectionDivider label="Invite to Shelf" />
            {myLibraries.map((lib) => (
              <TouchableOpacity
                key={lib.id}
                style={styles.inviteRow}
                onPress={() => handleInvite(lib)}
                disabled={invitingId === lib.id}
                activeOpacity={0.7}
              >
                <View style={styles.inviteIcon}>
                  <Ionicons name="library" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inviteName}>{lib.name}</Text>
                  <Text style={styles.inviteMeta}>{lib.isPublic ? 'Public' : 'Private'}</Text>
                </View>
                {invitingId === lib.id
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Ionicons name="share-outline" size={18} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Delete ── */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={styles.deleteBtnText}>Delete Patron</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Lend a Book Modal ── */}
      <Modal visible={lendVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setLendVisible(false)}>
              <Text style={styles.modalAction}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Lend to {firstName}</Text>
            <TouchableOpacity onPress={confirmLend} disabled={lending || !selectedBook}>
              <Text style={[styles.modalAction, { color: selectedBook ? colors.primaryDark : colors.border, fontWeight: '700' }]}>
                {lending ? '…' : 'Lend'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Selected book preview */}
          {selectedBook ? (
            <View style={styles.selectedBookCard}>
              <View style={styles.selectedSpine} />
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedTitle} numberOfLines={1}>{selectedBook.record.title}</Text>
                <Text style={styles.selectedAuthor} numberOfLines={1}>{selectedBook.record.authors[0] ?? ''}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedBook(null)}>
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.searchBar}>
              <Ionicons name="search" size={17} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search available books…"
                value={bookSearch}
                onChangeText={setBookSearch}
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
              {bookSearch.length > 0 && (
                <TouchableOpacity onPress={() => setBookSearch('')}>
                  <Ionicons name="close-circle" size={17} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {!selectedBook ? (
            <FlatList
              data={filteredBooks}
              keyExtractor={(b) => b.id}
              contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item: book }) => (
                <TouchableOpacity
                  style={styles.bookPickRow}
                  onPress={() => { setSelectedBook(book); setBookSearch(''); }}
                  activeOpacity={0.7}
                >
                  <View style={styles.bookPickSpine} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookPickTitle} numberOfLines={1}>{book.record.title}</Text>
                    <Text style={styles.bookPickAuthor} numberOfLines={1}>{book.record.authors.join(', ')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.borderDark} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyPick}>
                  <Ionicons name="book-outline" size={48} color={colors.border} />
                  <Text style={styles.emptyPickText}>
                    {availableBooks.length === 0
                      ? 'No books available to lend'
                      : 'No books match your search'}
                  </Text>
                </View>
              }
            />
          ) : (
            <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
              {/* Return date */}
              <View style={styles.fieldCard}>
                <Text style={styles.fieldLabel}>Return Date <Text style={styles.optional}>· optional</Text></Text>
                <TouchableOpacity
                  style={styles.dateTrigger}
                  onPress={() => setShowDatePicker((v) => !v)}
                >
                  <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                  <Text style={[styles.dateTriggerText, !returnDate && { color: colors.textMuted }]}>
                    {returnDate
                      ? returnDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
                      : 'No return date'}
                  </Text>
                  {returnDate && (
                    <TouchableOpacity onPress={() => { setReturnDate(null); setShowDatePicker(false); }}>
                      <Ionicons name="close-circle" size={16} color={colors.textMuted} />
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
                    onChange={(_e, date) => {
                      if (Platform.OS === 'android') setShowDatePicker(false);
                      if (date) setReturnDate(date);
                    }}
                  />
                )}
              </View>

              {/* Notes */}
              <View style={styles.fieldCard}>
                <Text style={styles.fieldLabel}>Notes <Text style={styles.optional}>· optional</Text></Text>
                <TextInput
                  style={[styles.fieldInput, { minHeight: 64 }]}
                  value={lendNotes}
                  onChangeText={setLendNotes}
                  placeholder="Any notes about this loan…"
                  multiline
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <TouchableOpacity
                style={[styles.lendBtn, lending && { opacity: 0.6 }]}
                onPress={confirmLend}
                disabled={lending}
              >
                {lending
                  ? <ActivityIndicator color="#fff" />
                  : <>
                      <Ionicons name="swap-horizontal" size={18} color="#fff" />
                      <Text style={styles.lendBtnText}>Confirm Loan</Text>
                    </>}
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Small reusable ────────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 16, color: colors.textMuted },
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },

  // Profile
  profileCenter: { alignItems: 'center', paddingTop: spacing.sm, gap: 4 },
  avatarLg: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center' },
  avatarLgText: { color: 'rgba(250,243,224,0.96)', fontSize: 32, fontWeight: '600' },
  contactName: { fontSize: 23, fontWeight: '700', color: colors.text, marginTop: 11, fontFamily: fonts.serif },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  metaText: { fontSize: 13, color: colors.textSecondary },
  editChip: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  editChipText: { color: colors.primary, fontWeight: '600', fontSize: 13 },

  // Edit mode
  editCard: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm },
  editAvatarRow: { alignItems: 'center', gap: 12, paddingBottom: spacing.sm },
  colorPicker: { flexDirection: 'row', gap: 10 },
  colorDot: { width: 26, height: 26, borderRadius: 13 },
  colorDotActive: { borderWidth: 3, borderColor: colors.background, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 0 }, elevation: 3 },
  editBtnRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  saveBtnInline: { flex: 1, backgroundColor: colors.primary, borderRadius: 10, padding: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtnInline: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, alignItems: 'center' },
  cancelBtnText: { color: colors.text, fontSize: 15 },

  // Stats
  statsBar: { flexDirection: 'row', backgroundColor: colors.surfaceCard, borderRadius: 13, borderWidth: 1, borderColor: colors.borderCard, overflow: 'hidden' },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statNum: { fontSize: 22, fontWeight: '700', fontFamily: fonts.serif },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.border },

  // Lend button
  lendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: colors.primary, borderRadius: 11, padding: 13 },
  lendBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Section
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.primaryDark, textTransform: 'uppercase', letterSpacing: 1.2, fontFamily: fonts.mono },
  sectionLine: { flex: 1, height: 1, backgroundColor: colors.border },

  // Active loan card
  loanCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 13, borderWidth: 1, borderColor: colors.border, padding: 10 },
  spineCover: { width: 38, height: 56, borderRadius: 4, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, flexShrink: 0 },
  loanInfo: { flex: 1, minWidth: 0, gap: 2 },
  loanTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  loanMeta: { fontSize: 12, color: colors.textSecondary },
  loanDate: { fontSize: 11, color: colors.textMuted },
  loanRight: { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  pill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 14 },
  pillText: { fontSize: 11, fontWeight: '600' },
  returnChip: { borderWidth: 1, borderColor: colors.success, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 },
  returnChipText: { fontSize: 11, fontWeight: '600', color: colors.success },

  // Past loans
  pastRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  pastDot: { width: 7, height: 7, borderRadius: 3.5, flexShrink: 0 },
  pastInfo: { flex: 1, minWidth: 0 },
  pastTitle: { fontSize: 14, fontWeight: '500', color: colors.text },
  pastMeta: { fontSize: 11.5, color: colors.textMuted, marginTop: 1 },
  pastBadge: { fontSize: 11.5, fontWeight: '600', flexShrink: 0 },

  // Invite
  inviteRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  inviteIcon: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  inviteName: { fontSize: 15, fontWeight: '600', color: colors.text },
  inviteMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  // Delete
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center', padding: spacing.md, borderWidth: 1, borderColor: colors.danger, borderRadius: radius.md },
  deleteBtnText: { color: colors.danger, fontWeight: '600' },

  // Lend modal
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderColor: colors.border },
  modalAction: { fontSize: 16, color: colors.primary },
  modalTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, marginHorizontal: spacing.md, marginTop: spacing.sm, paddingHorizontal: 13, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  selectedBookCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary, borderRadius: 12, marginHorizontal: spacing.md, marginTop: spacing.sm, padding: 11 },
  selectedSpine: { width: 32, height: 46, borderRadius: 4, backgroundColor: colors.primary, opacity: 0.35, flexShrink: 0 },
  selectedTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  selectedAuthor: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  bookPickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 10 },
  bookPickSpine: { width: 32, height: 46, borderRadius: 4, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, flexShrink: 0 },
  bookPickTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  bookPickAuthor: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  emptyPick: { alignItems: 'center', paddingTop: 60 },
  emptyPickText: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' },
  dateTrigger: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  dateTriggerText: { flex: 1, fontSize: 14, color: colors.text },

  // Shared field-card
  fieldCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 13 },
  fieldLabel: { fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  fieldInput: { fontSize: 15, color: colors.text, marginTop: 3, padding: 0 },
  optional: { textTransform: 'none', letterSpacing: 0, color: colors.borderDark },
});
