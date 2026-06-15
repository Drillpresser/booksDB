import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../src/theme';
import {
  getSystemById, getRootNodes, getChildNodes, searchNodes, hasChildren,
} from '../../src/database/queries/classificationSystems';
import type { ClassificationNode, ClassificationSystem } from '../../src/types';

export default function SystemDetailScreen() {
  const { systemId } = useLocalSearchParams<{ systemId: string }>();
  const [system, setSystem] = useState<ClassificationSystem | null>(null);
  const [stack, setStack] = useState<ClassificationNode[]>([]); // breadcrumb path
  const [nodes, setNodes] = useState<ClassificationNode[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ClassificationNode[] | null>(null);

  useEffect(() => {
    if (!systemId) return;
    const s = getSystemById(systemId);
    setSystem(s);
    setNodes(getRootNodes(systemId));
  }, [systemId]);

  useEffect(() => {
    if (!systemId) return;
    if (!searchQuery.trim()) { setSearchResults(null); return; }
    const results = searchNodes(systemId, searchQuery.trim());
    setSearchResults(results);
  }, [searchQuery, systemId]);

  function drillInto(node: ClassificationNode) {
    const children = getChildNodes(node.id);
    setStack(prev => [...prev, node]);
    setNodes(children);
    setSearchQuery('');
    setSearchResults(null);
  }

  function goBack() {
    const newStack = [...stack];
    newStack.pop();
    setStack(newStack);
    const parent = newStack[newStack.length - 1];
    setNodes(parent ? getChildNodes(parent.id) : getRootNodes(systemId!));
  }

  const displayNodes = searchResults ?? nodes;
  const currentParent = stack[stack.length - 1];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: system?.name ?? 'Browse' }} />

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: spacing.sm }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search codes or labels…"
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {!searchResults && stack.length > 0 && (
        <View style={styles.breadcrumb}>
          <TouchableOpacity onPress={() => { setStack([]); setNodes(getRootNodes(systemId!)); }} style={styles.breadcrumbItem}>
            <Text style={styles.breadcrumbText}>Root</Text>
          </TouchableOpacity>
          {stack.map((node, i) => (
            <React.Fragment key={node.id}>
              <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
              <TouchableOpacity
                style={styles.breadcrumbItem}
                onPress={() => {
                  const newStack = stack.slice(0, i + 1);
                  setStack(newStack);
                  const last = newStack[newStack.length - 1];
                  setNodes(getChildNodes(last.id));
                }}
              >
                <Text style={styles.breadcrumbText} numberOfLines={1}>{node.code}</Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      )}

      <FlatList
        data={displayNodes}
        keyExtractor={n => n.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          !searchResults && stack.length > 0 ? (
            <TouchableOpacity style={styles.backRow} onPress={goBack}>
              <Ionicons name="chevron-back" size={18} color={colors.primary} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          ) : null
        }
        renderItem={({ item }) => {
          const hasKids = hasChildren(item.id);
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => hasKids ? drillInto(item) : undefined}
              activeOpacity={hasKids ? 0.7 : 1}
            >
              <Text style={styles.code}>{item.code}</Text>
              <Text style={styles.label} numberOfLines={2}>{item.label}</Text>
              {hasKids
                ? <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                : <Ionicons name="ellipse-outline" size={10} color={colors.border} />}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={44} color={colors.border} />
            <Text style={styles.emptyText}>{searchQuery ? 'No matching entries.' : 'No entries at this level.'}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, margin: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: 2 },
  breadcrumbItem: { paddingHorizontal: spacing.xs },
  breadcrumbText: { fontSize: 13, color: colors.primary, fontWeight: '500' },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  backRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.xs },
  backText: { color: colors.primary, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderColor: colors.border, gap: spacing.md },
  code: { width: 56, fontSize: 13, fontWeight: '700', color: colors.primary, flexShrink: 0 },
  label: { flex: 1, fontSize: 15, color: colors.text },
  empty: { alignItems: 'center', paddingTop: 60, gap: spacing.md },
  emptyText: { color: colors.textSecondary, fontSize: 15 },
});
