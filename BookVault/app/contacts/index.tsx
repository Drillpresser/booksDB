import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, TextInput, Modal,
} from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, spacing, radius } from '../../src/theme';
import { getAllContacts, createContact, getContactLoanStatus } from '../../src/database/queries/contacts';
import type { Contact } from '../../src/types';
import type { ContactLoanStatus } from '../../src/database/queries/contacts';

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

function statusPill(status: ContactLoanStatus): { label: string; bg: string; color: string } | null {
  if (status.activeCount === 0) return { label: 'No books out', bg: '#EFE7CF', color: colors.textMuted };
  if (status.hasOverdue) return { label: `Overdue`, bg: '#F6E0E0', color: colors.danger };
  if (status.hasDueSoon) return { label: `${status.activeCount} due soon`, bg: '#FCEAD2', color: colors.primaryDark };
  return { label: `${status.activeCount} book${status.activeCount > 1 ? 's' : ''} out`, bg: '#EAF0DA', color: colors.accentDark };
}

type ContactWithStatus = Contact & { status: ContactLoanStatus };

export default function ContactsScreen() {
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactWithStatus[]>([]);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);

  useFocusEffect(
    useCallback(() => {
      loadContacts();
    }, [])
  );

  function loadContacts() {
    const all = getAllContacts();
    setContacts(all.map((c) => ({ ...c, status: getContactLoanStatus(c.id) })));
  }

  function openModal() {
    setName('');
    setPhone('');
    setEmail('');
    setSelectedColor(AVATAR_COLORS[0]);
    setModalVisible(true);
  }

  function handleAdd() {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter a patron name.');
      return;
    }
    createContact({ name: name.trim(), phone: phone.trim() || null, email: email.trim() || null, notes: null, color: selectedColor });
    loadContacts();
    setModalVisible(false);
  }

  const displayed = search.trim()
    ? contacts.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || (c.email ?? '').toLowerCase().includes(search.toLowerCase()))
    : contacts;

  const withBooks = contacts.filter((c) => c.status.activeCount > 0).length;
  const overdueCount = contacts.filter((c) => c.status.hasOverdue).length;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Patrons</Text>
        <TouchableOpacity onPress={openModal} style={{ padding: spacing.xs }}>
          <Ionicons name="person-add-outline" size={25} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={19} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search patrons…"
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={colors.textMuted}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={displayed}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          contacts.length > 0 ? (
            <View style={styles.statsRow}>
              <Text style={styles.statText}><Text style={styles.statBold}>{contacts.length}</Text> patrons</Text>
              {withBooks > 0 && (
                <>
                  <View style={styles.dot} />
                  <Text style={styles.statText}><Text style={styles.statBold}>{withBooks}</Text> with books out</Text>
                </>
              )}
              {overdueCount > 0 && (
                <>
                  <View style={styles.dot} />
                  <Text style={[styles.statText, { color: colors.danger, fontWeight: '600' }]}>{overdueCount} overdue</Text>
                </>
              )}
            </View>
          ) : null
        }
        renderItem={({ item: c }) => {
          const pill = statusPill(c.status);
          const avatarColor = getAvatarColor(c.id, c.color);
          return (
            <TouchableOpacity
              style={styles.contactRow}
              onPress={() => router.push(`/contacts/${c.id}`)}
              activeOpacity={0.7}
            >
              <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                <Text style={styles.avatarText}>{getInitials(c.name)}</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName} numberOfLines={1}>{c.name}</Text>
                {(c.email || c.phone) && (
                  <Text style={styles.contactMeta} numberOfLines={1}>{c.email || c.phone}</Text>
                )}
              </View>
              <View style={styles.metaRight}>
                {pill && (
                  <View style={[styles.pill, { backgroundColor: pill.bg }]}>
                    <Text style={[styles.pillText, { color: pill.color }]}>{pill.label}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={18} color={colors.borderDark} />
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={colors.border} />
            <Text style={styles.emptyTitle}>No patrons yet</Text>
            <Text style={styles.emptySubtitle}>Patrons are created when you lend a book, or tap + to add one.</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add a Patron</Text>
            <TouchableOpacity onPress={handleAdd}>
              <Text style={[styles.modalCancel, { color: colors.borderDark }]}>Save</Text>
            </TouchableOpacity>
          </View>

          {/* Avatar preview + color picker */}
          <View style={styles.avatarSection}>
            <View style={[styles.avatarLarge, { backgroundColor: selectedColor }]}>
              <Text style={styles.avatarLargeText}>{name ? getInitials(name) : '?'}</Text>
            </View>
            <View style={styles.colorRow}>
              {AVATAR_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c }, selectedColor === c && styles.colorDotSelected]}
                  onPress={() => setSelectedColor(c)}
                />
              ))}
            </View>
          </View>

          <View style={styles.modalForm}>
            <View style={styles.fieldCard}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                style={styles.fieldInput}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Elena Ruiz"
                autoFocus
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.fieldCard}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.fieldInput}
                value={email}
                onChangeText={setEmail}
                placeholder="Add an email address"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.fieldCard}>
              <Text style={styles.fieldLabel}>Phone <Text style={styles.optional}>· optional</Text></Text>
              <TextInput
                style={styles.fieldInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="Add a phone number"
                keyboardType="phone-pad"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
              <Text style={styles.saveBtnText}>Save Patron</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 6, paddingBottom: 2 },
  title: { fontSize: 34, fontWeight: '600', color: colors.text, letterSpacing: -0.3, fontFamily: fonts.serif },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, marginHorizontal: spacing.md, marginTop: spacing.sm, paddingHorizontal: 14, paddingVertical: 11 },
  searchInput: { flex: 1, fontSize: 16, color: colors.text },
  list: { padding: spacing.md, gap: spacing.sm },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.xs, paddingHorizontal: 2 },
  statText: { fontSize: 13, color: colors.textSecondary },
  statBold: { fontWeight: '700' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.border },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: colors.surfaceCard, borderRadius: 14, borderWidth: 1, borderColor: colors.borderCard, padding: 11 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText: { color: 'rgba(250,243,224,0.96)', fontSize: 16, fontWeight: '600' },
  contactInfo: { flex: 1, minWidth: 0 },
  contactName: { fontSize: 16, fontWeight: '600', color: colors.text, fontFamily: fonts.serif },
  contactMeta: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  metaRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 0 },
  pill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 14 },
  pillText: { fontSize: 11.5, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: spacing.md },
  emptySubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
  // Modal
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderColor: colors.border },
  modalCancel: { fontSize: 16, color: colors.primary },
  modalTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  avatarSection: { alignItems: 'center', paddingTop: 14, paddingBottom: 4 },
  avatarLarge: { width: 78, height: 78, borderRadius: 39, justifyContent: 'center', alignItems: 'center' },
  avatarLargeText: { color: 'rgba(250,243,224,0.96)', fontSize: 28, fontWeight: '600' },
  colorRow: { flexDirection: 'row', gap: 9, marginTop: 13 },
  colorDot: { width: 24, height: 24, borderRadius: 12 },
  colorDotSelected: { borderWidth: 2, borderColor: colors.background, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 0 }, elevation: 3 },
  modalForm: { padding: spacing.md, gap: spacing.sm },
  fieldCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 13 },
  fieldLabel: { fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  fieldInput: { fontSize: 15, color: colors.text, marginTop: 3, padding: 0 },
  optional: { textTransform: 'none', letterSpacing: 0, color: colors.borderDark },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 11, padding: 14, alignItems: 'center', marginTop: spacing.sm },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
