import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image, StyleSheet,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../src/theme';
import { getActiveLoans, returnLoan } from '../../src/database/queries/loans';
import type { LoanWithDetails } from '../../src/types';
import { Alert } from 'react-native';

export default function LendingScreen() {
  const router = useRouter();
  const [loans, setLoans] = useState<LoanWithDetails[]>([]);

  useFocusEffect(
    useCallback(() => {
      setLoans(getActiveLoans());
    }, [])
  );

  function handleReturn(loan: LoanWithDetails) {
    Alert.alert(
      'Mark as Returned',
      `Return "${loan.bookRecord.title}" from ${loan.contact.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Returned',
          onPress: () => {
            returnLoan(loan.id, new Date().toISOString());
            setLoans(getActiveLoans());
          },
        },
      ]
    );
  }

  function daysSince(dateStr: string): number {
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  const overdueLoans = loans.filter((l) => l.isOverdue);
  const currentLoans = loans.filter((l) => !l.isOverdue);

  function renderLoan(loan: LoanWithDetails) {
    const days = daysSince(loan.dateLent);
    return (
      <View style={[styles.loanCard, loan.isOverdue && styles.loanCardOverdue]}>
        <TouchableOpacity
          style={styles.loanCardInner}
          onPress={() => router.push(`/library/${loan.copyId}`)}
          activeOpacity={0.7}
        >
          {loan.bookRecord.coverImage ? (
            <Image source={{ uri: loan.bookRecord.coverImage }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]}>
              <Ionicons name="book-outline" size={24} color={colors.border} />
            </View>
          )}
          <View style={styles.loanInfo}>
            <Text style={styles.loanTitle} numberOfLines={2}>{loan.bookRecord.title}</Text>
            <Text style={styles.loanBorrower}>{loan.contact.name}</Text>
            <Text style={[styles.loanDays, loan.isOverdue && { color: colors.danger }]}>
              {loan.isOverdue ? 'OVERDUE · ' : ''}{days} day{days !== 1 ? 's' : ''} out
            </Text>
            {loan.expectedReturn && (
              <Text style={[styles.loanDue, loan.isOverdue && { color: colors.danger }]}>
                Due: {formatDate(loan.expectedReturn)}
              </Text>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.returnBtn} onPress={() => handleReturn(loan)}>
          <Text style={styles.returnBtnText}>Returned</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <DrawerToggleButton tintColor="#fff" />
        <Text style={styles.headerTitle}>Lending</Text>
      </View>

      <FlatList
        data={[...overdueLoans, ...currentLoans]}
        keyExtractor={(l) => l.id}
        renderItem={({ item }) => renderLoan(item)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          overdueLoans.length > 0 ? (
            <View style={styles.overdueHeader}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.overdueHeaderText}>{overdueLoans.length} overdue loan{overdueLoans.length > 1 ? 's' : ''}</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="swap-horizontal-outline" size={64} color={colors.border} />
            <Text style={styles.emptyTitle}>No books out on loan</Text>
            <Text style={styles.emptySubtitle}>Lend a book from its detail page</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  headerTitle: { flex: 1, color: '#fff', fontSize: 20, fontWeight: '700', marginLeft: spacing.xs },
  list: { padding: spacing.md, gap: spacing.sm },
  overdueHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: '#FFEBEE', padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm },
  overdueHeaderText: { color: colors.danger, fontWeight: '700', fontSize: 14 },
  loanCard: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  loanCardOverdue: { borderColor: colors.danger },
  loanCardInner: { flexDirection: 'row', padding: spacing.md, gap: spacing.md },
  cover: { width: 48, height: 68, borderRadius: radius.sm },
  coverPlaceholder: { backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  loanInfo: { flex: 1, gap: 3 },
  loanTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  loanBorrower: { fontSize: 14, color: colors.textSecondary },
  loanDays: { fontSize: 13, color: colors.textSecondary },
  loanDue: { fontSize: 13, color: colors.textSecondary },
  returnBtn: { backgroundColor: colors.success, padding: spacing.sm, alignItems: 'center' },
  returnBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: spacing.md },
  emptySubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
});
