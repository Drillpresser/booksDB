import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../src/theme';
import { getPublicLibraries } from '../../src/services/library';
import type { LibraryWithMeta } from '../../src/services/library';

export default function BrowseShelvesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [libraries, setLibraries] = useState<LibraryWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(q?: string) {
    setLoading(true);
    try {
      const data = await getPublicLibraries(q);
      setLibraries(data);
    } catch {
      setLibraries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: spacing.sm }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search shelves..."
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => load(search)}
          returnKeyType="search"
          placeholderTextColor={colors.textSecondary}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(''); load(); }}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={libraries}
          keyExtractor={(l) => l.id}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
          renderItem={({ item }) => (
            <LibraryRow lib={item} onPress={() => router.push(`/library/view/${item.id}`)} />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="library-outline" size={48} color={colors.border} />
              <Text style={styles.emptyText}>No public shelves found.</Text>
              {search.trim() ? (
                <TouchableOpacity onPress={() => { setSearch(''); load(); }} style={styles.clearBtn}>
                  <Text style={styles.clearBtnText}>Clear search</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function LibraryRow({ lib, onPress }: { lib: LibraryWithMeta; onPress: () => void }) {
  const statusColor =
    lib.myCardStatus === 'approved' ? colors.success
    : lib.myCardStatus === 'pending' ? colors.warning
    : lib.myCardStatus === 'denied' ? colors.danger
    : null;

  const statusLabel =
    lib.myCardStatus === 'approved' ? 'Card Holder'
    : lib.myCardStatus === 'pending' ? 'Pending'
    : lib.myCardStatus === 'denied' ? 'Denied'
    : null;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowIcon}>
        <Ionicons name="library" size={24} color={colors.primary} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{lib.name}</Text>
        <Text style={styles.rowOwner}>by {lib.ownerDisplayName}</Text>
        <Text style={styles.rowCount}>
          {lib.bookCount} {lib.bookCount === 1 ? 'book' : 'books'}
        </Text>
      </View>
      <View style={styles.rowRight}>
        {statusLabel && statusColor && (
          <View style={[styles.statusBadge, { borderColor: statusColor }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    margin: spacing.md, marginBottom: spacing.sm, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.text },
  center: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' },
  clearBtn: { marginTop: spacing.sm, padding: spacing.sm },
  clearBtnText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  rowIcon: {
    width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primaryLight,
    justifyContent: 'center', alignItems: 'center', marginRight: spacing.md,
  },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 16, fontWeight: '700', color: colors.text },
  rowOwner: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  rowCount: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: spacing.xs },
  statusBadge: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
});
