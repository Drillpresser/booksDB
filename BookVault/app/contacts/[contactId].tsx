import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, TextInput, Image, Share, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../src/theme';
import { getContactById, updateContact, deleteContact } from '../../src/database/queries/contacts';
import { getLoanHistoryForContact } from '../../src/database/queries/loans';
import { getMyLibraries, createInvite } from '../../src/services/library';
import type { Library } from '../../src/services/library';
import type { Contact, LoanWithDetails } from '../../src/types';

export default function ContactDetailScreen() {
  const { contactId } = useLocalSearchParams<{ contactId: string }>();
  const router = useRouter();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loans, setLoans] = useState<LoanWithDetails[]>([]);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [myLibraries, setMyLibraries] = useState<Library[]>([]);
  const [invitingLibraryId, setInvitingLibraryId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [contactId])
  );

  function loadData() {
    if (!contactId) return;
    const c = getContactById(contactId);
    setContact(c);
    setLoans(getLoanHistoryForContact(contactId));
    getMyLibraries().then(setMyLibraries).catch(() => {});
  }

  function startEdit() {
    if (!contact) return;
    setEditName(contact.name);
    setEditPhone(contact.phone ?? '');
    setEditEmail(contact.email ?? '');
    setEditing(true);
  }

  function saveEdit() {
    if (!contact || !editName.trim()) return;
    updateContact(contact.id, {
      name: editName.trim(),
      phone: editPhone.trim() || null,
      email: editEmail.trim() || null,
    });
    loadData();
    setEditing(false);
  }

  async function handleInviteToShelf(lib: Library) {
    setInvitingLibraryId(lib.id);
    try {
      const inv = await createInvite(lib.id);
      if (!inv?.inviteToken) throw new Error('No token');
      const link = `bookvault://library/invite/${inv.inviteToken}`;
      await Share.share({
        message: `${contact?.name ?? 'You'} — you're invited to ${lib.name} on BookHoarder!\n\n${link}`,
        title: `Invite to ${lib.name}`,
      });
    } catch {
      Alert.alert('Error', 'Could not create invite link.');
    } finally {
      setInvitingLibraryId(null);
    }
  }

  function handleDelete() {
    if (!contact) return;
    const activeLoans = loans.filter((l) => !l.dateReturned);
    if (activeLoans.length > 0) {
      Alert.alert('Cannot Delete', 'This patron currently has books on loan. Return them first.');
      return;
    }
    Alert.alert('Delete Patron', `Delete ${contact.name}? Their loan history will also be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteContact(contact.id);
          router.back();
        },
      },
    ]);
  }

  if (!contact) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><Text style={styles.notFound}>Patron not found.</Text></View>
      </SafeAreaView>
    );
  }

  const activeLoans = loans.filter((l) => !l.dateReturned);
  const pastLoans = loans.filter((l) => l.dateReturned);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{contact.name.charAt(0).toUpperCase()}</Text>
          </View>
          {editing ? (
            <View style={styles.editFields}>
              <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Name" placeholderTextColor={colors.textSecondary} />
              <TextInput style={styles.input} value={editPhone} onChangeText={setEditPhone} placeholder="Phone" keyboardType="phone-pad" placeholderTextColor={colors.textSecondary} />
              <TextInput style={styles.input} value={editEmail} onChangeText={setEditEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none" placeholderTextColor={colors.textSecondary} />
              <View style={styles.editBtnRow}>
                <TouchableOpacity style={styles.saveBtn} onPress={saveEdit}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.profileInfo}>
              <Text style={styles.contactName}>{contact.name}</Text>
              {contact.phone && (
                <View style={styles.metaRow}>
                  <Ionicons name="call-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.metaText}>{contact.phone}</Text>
                </View>
              )}
              {contact.email && (
                <View style={styles.metaRow}>
                  <Ionicons name="mail-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.metaText}>{contact.email}</Text>
                </View>
              )}
              <TouchableOpacity style={styles.editBtn} onPress={startEdit}>
                <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {activeLoans.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Currently Borrowing ({activeLoans.length})</Text>
            {activeLoans.map((loan) => (
              <LoanRow key={loan.id} loan={loan} onPress={() => router.push(`/library/${loan.copyId}`)} />
            ))}
          </View>
        )}

        {pastLoans.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Past Loans ({pastLoans.length})</Text>
            {pastLoans.map((loan) => (
              <LoanRow key={loan.id} loan={loan} onPress={() => router.push(`/library/${loan.copyId}`)} />
            ))}
          </View>
        )}

        {loans.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No loan history for this patron.</Text>
          </View>
        )}

        {myLibraries.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invite to Shelf</Text>
            {myLibraries.map((lib) => (
              <TouchableOpacity
                key={lib.id}
                style={styles.inviteRow}
                onPress={() => handleInviteToShelf(lib)}
                disabled={invitingLibraryId === lib.id}
                activeOpacity={0.7}
              >
                <View style={styles.inviteRowIcon}>
                  <Ionicons name="library" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inviteRowName}>{lib.name}</Text>
                  <Text style={styles.inviteRowMeta}>{lib.isPublic ? 'Public' : 'Private'}</Text>
                </View>
                {invitingLibraryId === lib.id
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Ionicons name="share-outline" size={18} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={styles.deleteBtnText}>Delete Patron</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LoanRow({ loan, onPress }: { loan: LoanWithDetails; onPress: () => void }) {
  const isActive = !loan.dateReturned;
  return (
    <TouchableOpacity style={[styles.loanRow, loan.isOverdue && styles.loanRowOverdue]} onPress={onPress} activeOpacity={0.7}>
      {loan.bookRecord.coverImage ? (
        <Image source={{ uri: loan.bookRecord.coverImage }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <Ionicons name="book-outline" size={20} color={colors.border} />
        </View>
      )}
      <View style={styles.loanInfo}>
        <Text style={styles.loanTitle} numberOfLines={2}>{loan.bookRecord.title}</Text>
        <Text style={styles.loanDates}>{formatDate(loan.dateLent)}{loan.dateReturned ? ` – ${formatDate(loan.dateReturned)}` : ' – present'}</Text>
        {loan.isOverdue && <Text style={styles.overdueLabel}>OVERDUE</Text>}
      </View>
      {isActive && <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>Out</Text></View>}
    </TouchableOpacity>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 16, color: colors.textSecondary },
  scroll: { padding: spacing.md, gap: spacing.lg },
  profileHeader: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '700' },
  profileInfo: { flex: 1, gap: spacing.xs },
  contactName: { fontSize: 22, fontWeight: '700', color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { fontSize: 14, color: colors.textSecondary },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  editBtnText: { color: colors.primary, fontWeight: '600' },
  editFields: { flex: 1, gap: spacing.sm },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, fontSize: 15, color: colors.text },
  editBtnRow: { flexDirection: 'row', gap: spacing.sm },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' },
  cancelBtnText: { color: colors.text },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  loanRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  loanRowOverdue: { borderColor: colors.danger },
  cover: { width: 42, height: 60, borderRadius: radius.sm },
  coverPlaceholder: { backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  loanInfo: { flex: 1 },
  loanTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  loanDates: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  overdueLabel: { fontSize: 11, color: colors.danger, fontWeight: '700', marginTop: 2 },
  activeBadge: { backgroundColor: colors.onLoan, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  activeBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  emptyState: { alignItems: 'center', padding: spacing.xl },
  emptyText: { fontSize: 14, color: colors.textSecondary },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center', padding: spacing.md, borderWidth: 1, borderColor: colors.danger, borderRadius: radius.md },
  deleteBtnText: { color: colors.danger, fontWeight: '600' },
  inviteRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  inviteRowIcon: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  inviteRowName: { fontSize: 15, fontWeight: '600', color: colors.text },
  inviteRowMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
