import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, Alert, TextInput, Modal, FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../src/theme';
import { getCopyById, updateBookCopy, deleteBookCopy } from '../../src/database/queries/books';
import { getLoanHistoryForCopy, createLoan, returnLoan } from '../../src/database/queries/loans';
import { getAllContacts, createContact } from '../../src/database/queries/contacts';
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
  const [expectedReturn, setExpectedReturn] = useState('');
  const [loanNotes, setLoanNotes] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [showNewContact, setShowNewContact] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [copyId])
  );

  function loadData() {
    if (!copyId) return;
    const data = getCopyById(copyId);
    setBook(data);
    setLoanHistory(getLoanHistoryForCopy(copyId));
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
        },
      },
    ]);
  }

  function handleLend() {
    setContacts(getAllContacts());
    setSelectedContact(null);
    setExpectedReturn('');
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
      contactId = createContact({ name: newContactName.trim(), phone: null, email: null, notes: null });
    }

    if (!contactId) {
      Alert.alert('Select Contact', 'Choose who you are lending to.');
      return;
    }

    const returnDate = expectedReturn.trim() || null;
    createLoan(book.id, contactId, new Date().toISOString(), returnDate, loanNotes.trim() || null);
    setLendModalVisible(false);
    loadData();
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
          deleteBookCopy(book.id);
          router.back();
        },
      },
    ]);
  }

  if (!book) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><Text style={styles.notFound}>Book not found.</Text></View>
      </SafeAreaView>
    );
  }

  const pastLoans = loanHistory.filter((l) => l.dateReturned !== null);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.heroRow}>
          {book.record.coverImage ? (
            <Image source={{ uri: book.record.coverImage }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]}>
              <Ionicons name="book-outline" size={48} color={colors.border} />
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

        {!book.isOnLoan && (
          <TouchableOpacity style={styles.lendBtn} onPress={handleLend}>
            <Ionicons name="swap-horizontal-outline" size={20} color="#fff" />
            <Text style={styles.lendBtnText}>Lend This Book</Text>
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Rating</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => handleRating(star)}>
                <Ionicons
                  name={star <= (book.personalRating ?? 0) ? 'star' : 'star-outline'}
                  size={32}
                  color={star <= (book.personalRating ?? 0) ? colors.accent : colors.border}
                />
              </TouchableOpacity>
            ))}
          </View>
          {book.record.communityRating && (
            <Text style={styles.communityRating}>
              Community: {book.record.communityRating.toFixed(1)} ★
              {book.record.communityRatingCount ? ` (${book.record.communityRatingCount.toLocaleString()} ratings)` : ''}
            </Text>
          )}
        </View>

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

        <View style={styles.section}>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={styles.deleteBtnText}>Delete This Copy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={lendModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Lend Book</Text>
            <TouchableOpacity onPress={() => setLendModalVisible(false)}>
              <Ionicons name="close" size={26} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
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
                  <Text style={[styles.contactName, { color: colors.primary }]}>New Contact</Text>
                </TouchableOpacity>
              }
            />
            {showNewContact && (
              <TextInput style={styles.modalInput} placeholder="Contact name" value={newContactName} onChangeText={setNewContactName} autoFocus placeholderTextColor={colors.textSecondary} />
            )}
            <Text style={styles.fieldLabel}>Expected Return Date (optional, YYYY-MM-DD)</Text>
            <TextInput style={styles.modalInput} placeholder="e.g. 2026-08-01" value={expectedReturn} onChangeText={setExpectedReturn} placeholderTextColor={colors.textSecondary} />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 16, color: colors.textSecondary },
  scroll: { padding: spacing.md, gap: spacing.md },
  heroRow: { flexDirection: 'row', gap: spacing.md },
  cover: { width: 90, height: 128, borderRadius: radius.md },
  coverPlaceholder: { backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  heroInfo: { flex: 1, gap: spacing.xs },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  authors: { fontSize: 14, color: colors.textSecondary },
  meta: { fontSize: 13, color: colors.textSecondary },
  copyLabel: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  classCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.md },
  classText: { flex: 1, fontSize: 13, color: colors.primary },
  loanCard: { backgroundColor: '#FFF8E1', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.onLoan, gap: spacing.xs },
  loanCardOverdue: { backgroundColor: '#FFEBEE', borderColor: colors.danger },
  loanCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  loanCardTitle: { fontSize: 15, fontWeight: '700', color: colors.onLoan },
  loanDetail: { fontSize: 14, color: colors.text },
  loanDetailBold: { fontWeight: '700' },
  returnBtn: { marginTop: spacing.sm, backgroundColor: colors.success, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' },
  returnBtnText: { color: '#fff', fontWeight: '700' },
  lendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md },
  lendBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
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
});
