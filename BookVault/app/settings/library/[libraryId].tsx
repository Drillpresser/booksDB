import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, Switch, Share,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../../src/theme';
import {
  getLibraryById, getCardsForLibrary, getRequestsForLibrary,
  updateLibrary, deleteLibrary, updateCardStatus, deleteCard,
  createInvite, updateRequestStatus,
} from '../../../src/services/library';
import type { Library, LibraryCard, BookRequest } from '../../../src/services/library';
import { supabase } from '../../../src/lib/supabase';

export default function ManageLibraryScreen() {
  const { libraryId } = useLocalSearchParams<{ libraryId: string }>();
  const router = useRouter();

  const [library, setLibrary] = useState<Library | null>(null);
  const [cards, setCards] = useState<LibraryCard[]>([]);
  const [requests, setRequests] = useState<BookRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPublic, setEditPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!libraryId) return;
      load();
    }, [libraryId])
  );

  async function load() {
    setLoading(true);
    try {
      const [lib, c, r] = await Promise.all([
        getLibraryById(libraryId!),
        getCardsForLibrary(libraryId!),
        getRequestsForLibrary(libraryId!),
      ]);
      if (lib) {
        setLibrary(lib);
        setEditName(lib.name);
        setEditDesc(lib.description ?? '');
        setEditPublic(lib.isPublic);
      }
      setCards(c);
      setRequests(r);
    } catch {
      setLibrary(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!libraryId) return;
    async function refresh() {
      const [c, r] = await Promise.all([
        getCardsForLibrary(libraryId!),
        getRequestsForLibrary(libraryId!),
      ]);
      setCards(c);
      setRequests(r);
    }
    const channel = supabase
      .channel(`manage-${libraryId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'library_cards', filter: `library_id=eq.${libraryId}` }, () => { refresh(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'book_requests', filter: `library_id=eq.${libraryId}` }, () => { refresh(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [libraryId]);

  async function handleSave() {
    if (!editName.trim()) {
      Alert.alert('Name Required', 'Enter a name for your shelf.');
      return;
    }
    setSaving(true);
    try {
      await updateLibrary(libraryId!, {
        name: editName.trim(),
        description: editDesc.trim() || null,
        isPublic: editPublic,
      });
      await load();
      Alert.alert('Saved', 'Shelf updated.');
    } catch {
      Alert.alert('Error', 'Could not save shelf changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateInvite() {
    setCreatingInvite(true);
    try {
      const inv = await createInvite(libraryId!);
      if (!inv?.inviteToken) throw new Error('No token');
      const link = `bookvault://library/invite/${inv.inviteToken}`;
      await Share.share({
        message: `You're invited to ${library?.name ?? 'my shelf'} on BookHoarder!\n\n${link}`,
        title: `Join ${library?.name ?? 'my shelf'}`,
      });
    } catch {
      Alert.alert('Error', 'Could not create invite link.');
    } finally {
      setCreatingInvite(false);
    }
  }

  async function handleCardAction(cardId: string, action: 'approved' | 'denied' | 'delete') {
    try {
      if (action === 'delete') {
        await deleteCard(cardId);
      } else {
        await updateCardStatus(cardId, action);
      }
      await load();
    } catch {
      Alert.alert('Error', 'Could not update card status.');
    }
  }

  async function handleRequestAction(requestId: string, action: 'approved' | 'denied' | 'fulfilled') {
    try {
      await updateRequestStatus(requestId, action);
      await load();
    } catch {
      Alert.alert('Error', 'Could not update request.');
    }
  }

  function handleDelete() {
    Alert.alert(
      'Delete Shelf',
      'Delete this shelf? All cards and book data will be removed. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLibrary(libraryId!);
              router.back();
            } catch {
              Alert.alert('Error', 'Could not delete shelf.');
            }
          },
        },
      ]
    );
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
        <View style={styles.center}><Text style={styles.notFound}>Shelf not found.</Text></View>
      </SafeAreaView>
    );
  }

  const pendingCards = cards.filter((c) => c.status === 'pending');
  const approvedCards = cards.filter((c) => c.status === 'approved');
  const pendingRequests = requests.filter((r) => r.status === 'pending');

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: library.name }} />
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <Text style={styles.fieldLabel}>Shelf Name</Text>
          <TextInput
            style={styles.input}
            value={editName}
            onChangeText={setEditName}
            placeholderTextColor={colors.textSecondary}
          />
          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            style={[styles.input, { minHeight: 70 }]}
            value={editDesc}
            onChangeText={setEditDesc}
            placeholder="Optional description..."
            multiline
            placeholderTextColor={colors.textSecondary}
          />
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Public Shelf</Text>
              <Text style={styles.switchHint}>Visible in Browse and open for card applications</Text>
            </View>
            <Switch
              value={editPublic}
              onValueChange={setEditPublic}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>Save Changes</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invite</Text>
          <Text style={styles.sectionDesc}>
            Create a one-use invite link to send via text or email. The recipient gets immediate access.
          </Text>
          <TouchableOpacity
            style={[styles.outlineBtn, creatingInvite && { opacity: 0.6 }]}
            onPress={handleCreateInvite}
            disabled={creatingInvite}
          >
            {creatingInvite ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Ionicons name="link-outline" size={18} color={colors.primary} />
                <Text style={styles.outlineBtnText}>Create & Share Invite Link</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {pendingCards.length > 0 && (
          <>
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pending Applications ({pendingCards.length})</Text>
              {pendingCards.map((c) => (
                <View key={c.id} style={styles.cardRow}>
                  <View style={styles.cardAvatar}>
                    <Text style={styles.cardAvatarText}>
                      {(c.requesterDisplayName ?? '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{c.requesterDisplayName ?? 'Unknown'}</Text>
                    {c.message ? <Text style={styles.cardMessage} numberOfLines={2}>{c.message}</Text> : null}
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleCardAction(c.id, 'approved')}
                    >
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.denyBtn}
                      onPress={() => handleCardAction(c.id, 'denied')}
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {approvedCards.length > 0 && (
          <>
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cardholders ({approvedCards.length})</Text>
              {approvedCards.map((c) => (
                <View key={c.id} style={styles.cardRow}>
                  <View style={styles.cardAvatar}>
                    <Text style={styles.cardAvatarText}>
                      {(c.requesterDisplayName ?? '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.cardName, { flex: 1 }]}>{c.requesterDisplayName ?? 'Member'}</Text>
                  <TouchableOpacity
                    style={styles.removeCardBtn}
                    onPress={() =>
                      Alert.alert('Remove Cardholder', `Remove ${c.requesterDisplayName ?? 'this member'}?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Remove', style: 'destructive', onPress: () => handleCardAction(c.id, 'delete') },
                      ])
                    }
                  >
                    <Text style={styles.removeCardBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}

        {pendingRequests.length > 0 && (
          <>
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Book Requests ({pendingRequests.length})</Text>
              {pendingRequests.map((r) => (
                <View key={r.id} style={styles.requestRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.requestTitle} numberOfLines={2}>{r.bookTitle}</Text>
                    <Text style={styles.requestMeta}>
                      {r.requesterDisplayName ?? 'Someone'} · {r.type === 'checkout' ? 'Checkout' : 'Hold'}
                    </Text>
                    {r.notes ? <Text style={styles.requestNotes} numberOfLines={1}>{r.notes}</Text> : null}
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={styles.fulfillBtn}
                      onPress={() => handleRequestAction(r.id, 'fulfilled')}
                    >
                      <Text style={styles.fulfillBtnText}>Fulfill</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.denyRequestBtn}
                      onPress={() => handleRequestAction(r.id, 'denied')}
                    >
                      <Text style={styles.denyRequestBtnText}>Deny</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={styles.divider} />
        <View style={styles.section}>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={styles.deleteBtnText}>Delete Shelf</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 16, color: colors.textSecondary },
  scroll: { padding: spacing.md, gap: spacing.md },
  section: { gap: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  sectionDesc: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 15, color: colors.text },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  switchLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  switchHint: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, padding: spacing.md },
  outlineBtnText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.border },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  cardAvatarText: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  cardName: { fontSize: 15, fontWeight: '600', color: colors.text },
  cardMessage: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: spacing.sm },
  approveBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.success, justifyContent: 'center', alignItems: 'center' },
  denyBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.danger, justifyContent: 'center', alignItems: 'center' },
  removeCardBtn: { borderWidth: 1, borderColor: colors.danger, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  removeCardBtnText: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  requestRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  requestTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  requestMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  requestNotes: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  requestActions: { gap: spacing.xs },
  fulfillBtn: { backgroundColor: colors.success, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, alignItems: 'center' },
  fulfillBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  denyRequestBtn: { borderWidth: 1, borderColor: colors.danger, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, alignItems: 'center' },
  denyRequestBtnText: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center', padding: spacing.md, borderWidth: 1, borderColor: colors.danger, borderRadius: radius.md },
  deleteBtnText: { color: colors.danger, fontWeight: '600' },
});
