import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, TextInput, Modal,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../src/theme';
import { getAllContacts, createContact, getActiveLoansCountForContact } from '../../src/database/queries/contacts';
import type { Contact } from '../../src/types';

export default function ContactsScreen() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  useFocusEffect(
    useCallback(() => {
      setContacts(getAllContacts());
    }, [])
  );

  function handleAdd() {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter a contact name.');
      return;
    }
    createContact({ name: name.trim(), phone: phone.trim() || null, email: email.trim() || null, notes: null });
    setContacts(getAllContacts());
    setModalVisible(false);
    setName('');
    setPhone('');
    setEmail('');
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contacts</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={contacts}
        keyExtractor={(c) => c.id}
        renderItem={({ item: c }) => {
          const activeLoans = getActiveLoansCountForContact(c.id);
          return (
            <TouchableOpacity
              style={styles.contactRow}
              onPress={() => router.push(`/contacts/${c.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{c.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{c.name}</Text>
                {c.phone && <Text style={styles.contactMeta}>{c.phone}</Text>}
                {c.email && <Text style={styles.contactMeta}>{c.email}</Text>}
              </View>
              {activeLoans > 0 && (
                <View style={styles.loanBadge}>
                  <Text style={styles.loanBadgeText}>{activeLoans} out</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={colors.border} />
            <Text style={styles.emptyTitle}>No contacts yet</Text>
            <Text style={styles.emptySubtitle}>Contacts are created when you lend a book, or you can add them here.</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Contact</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={26} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalForm}>
            <TextInput style={styles.input} placeholder="Name *" value={name} onChangeText={setName} autoFocus placeholderTextColor={colors.textSecondary} />
            <TextInput style={styles.input} placeholder="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor={colors.textSecondary} />
            <TextInput style={styles.input} placeholder="Email (optional)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={colors.textSecondary} />
            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
              <Text style={styles.saveBtnText}>Add Contact</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A0800', paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  headerTitle: { flex: 1, color: '#FFFFFF', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  addButton: { padding: spacing.xs },
  list: { padding: spacing.md, gap: spacing.sm },
  contactRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, fontWeight: '600', color: colors.text },
  contactMeta: { fontSize: 13, color: colors.textSecondary },
  loanBadge: { backgroundColor: colors.onLoan, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  loanBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: spacing.md },
  emptySubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  modalForm: { padding: spacing.md, gap: spacing.md },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 16, color: colors.text },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
