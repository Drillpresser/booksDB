import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../src/theme';
import { getBlockedUsers, unblockUser } from '../../src/services/moderation';
import type { BlockedUser } from '../../src/services/moderation';
import { formatDate } from '../../src/lib/dates';

export default function BlockedUsersScreen() {
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    setLoading(true);
    try {
      setBlocked(await getBlockedUsers());
    } catch {
      Alert.alert('Error', 'Could not load blocked users. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  function confirmUnblock(u: BlockedUser) {
    Alert.alert(
      `Unblock ${u.displayName}?`,
      "You'll see their reviews and shelves again, and they'll be able to apply to your shelves. Cards that were removed when you blocked them aren't restored.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            try {
              await unblockUser(u.userId);
              setBlocked((prev) => prev.filter((b) => b.userId !== u.userId));
            } catch {
              Alert.alert('Error', 'Could not unblock. Please try again.');
            }
          },
        },
      ],
    );
  }

  if (loading && blocked.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={blocked}
        keyExtractor={(u) => u.userId}
        contentContainerStyle={styles.list}
        onRefresh={load}
        refreshing={loading}
        ListHeaderComponent={
          <Text style={styles.intro}>
            You don't see content from people you've blocked, and they can't apply to or request books from your shelves.
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={44} color={colors.border} />
            <Text style={styles.emptyText}>You haven't blocked anyone.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.displayName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.displayName}</Text>
              <Text style={styles.meta}>Blocked {formatDate(item.blockedAt)}</Text>
            </View>
            <TouchableOpacity style={styles.unblockBtn} onPress={() => confirmUnblock(item)}>
              <Text style={styles.unblockText}>Unblock</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.md, gap: spacing.sm },
  intro: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.sm },
  empty: { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { fontSize: 14, color: colors.textSecondary },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface,
    borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: colors.accent, fontWeight: '700', fontSize: 16 },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  unblockBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  unblockText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
});
