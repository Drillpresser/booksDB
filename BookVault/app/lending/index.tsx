import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../src/theme';
import { getActiveLoans, getAllReturnedLoans, returnLoan } from '../../src/database/queries/loans';
import type { LoanWithDetails } from '../../src/types';

type Tab = 'active' | 'history';

function duePill(loan: LoanWithDetails): { label: string; bg: string; color: string } {
  if (loan.isOverdue) {
    const days = Math.floor((Date.now() - new Date(loan.expectedReturn ?? loan.dateLent).getTime()) / 86400000);
    return { label: `Overdue ${days}d`, bg: '#F6E0E0', color: colors.danger };
  }
  if (loan.expectedReturn) {
    const daysLeft = Math.ceil((new Date(loan.expectedReturn).getTime() - Date.now()) / 86400000);
    if (daysLeft <= 3) return { label: `Due in ${daysLeft}d`, bg: '#FCEAD2', color: colors.primaryDark };
    const d = new Date(loan.expectedReturn);
    const label = `Due ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    return { label, bg: '#EAF0DA', color: colors.accentDark };
  }
  const days = Math.floor((Date.now() - new Date(loan.dateLent).getTime()) / 86400000);
  return { label: `${days}d out`, bg: '#EAF0DA', color: colors.accentDark };
}

function returnedPill(loan: LoanWithDetails): { label: string; bg: string; color: string } {
  // was it returned late?
  if (loan.expectedReturn && loan.dateReturned) {
    const late = new Date(loan.dateReturned) > new Date(loan.expectedReturn);
    const daysLate = late
      ? Math.ceil((new Date(loan.dateReturned).getTime() - new Date(loan.expectedReturn).getTime()) / 86400000)
      : 0;
    if (late) return { label: `${daysLate}d late`, bg: '#FCEAD2', color: colors.primaryDark };
  }
  return { label: 'On time', bg: '#EAF0DA', color: colors.accentDark };
}

function SpineCover({ size = 48 }: { size?: number }) {
  return (
    <View style={{ width: size * 0.67, height: size, borderRadius: 4, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', flexShrink: 0 }}>
      <View style={{ position: 'absolute', left: 5, top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.4)' }} />
    </View>
  );
}

export default function LendingScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('active');
  const [loans, setLoans] = useState<LoanWithDetails[]>([]);
  const [history, setHistory] = useState<LoanWithDetails[]>([]);

  useFocusEffect(
    useCallback(() => {
      setLoans(getActiveLoans());
      setHistory(getAllReturnedLoans());
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
            setHistory(getAllReturnedLoans());
          },
        },
      ]
    );
  }

  const overdueCount = loans.filter((l) => l.isOverdue).length;
  const lateCount = history.filter((l) => l.expectedReturn && l.dateReturned && new Date(l.dateReturned) > new Date(l.expectedReturn)).length;

  // Group history by month
  const historyGroups = useMemo(() => {
    const groups: { month: string; items: LoanWithDetails[] }[] = [];
    for (const loan of history) {
      const d = new Date(loan.dateReturned!);
      const month = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      const last = groups[groups.length - 1];
      if (last && last.month === month) last.items.push(loan);
      else groups.push({ month, items: [loan] });
    }
    return groups;
  }, [history]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Lending</Text>
      </View>

      {/* Segmented control */}
      <View style={styles.segmented}>
        <TouchableOpacity style={[styles.segment, tab === 'active' && styles.segmentActive]} onPress={() => setTab('active')}>
          <Text style={[styles.segmentText, tab === 'active' && styles.segmentTextActive]}>Active · {loans.length}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.segment, tab === 'history' && styles.segmentActive]} onPress={() => setTab('history')}>
          <Text style={[styles.segmentText, tab === 'history' && styles.segmentTextActive]}>History</Text>
        </TouchableOpacity>
      </View>

      {tab === 'active' ? (
        <FlatList
          data={loans}
          keyExtractor={(l) => l.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            loans.length > 0 ? (
              <View style={styles.statsRow}>
                <Text style={styles.statText}><Text style={styles.statBold}>{loans.length}</Text> on loan</Text>
                {overdueCount > 0 && (
                  <>
                    <View style={styles.dot} />
                    <Text style={[styles.statText, { color: colors.danger, fontWeight: '600' }]}>{overdueCount} overdue</Text>
                  </>
                )}
              </View>
            ) : null
          }
          renderItem={({ item: loan }) => {
            const pill = duePill(loan);
            return (
              <TouchableOpacity
                style={styles.loanCard}
                onPress={() => router.push(`/library/${loan.copyId}`)}
                activeOpacity={0.7}
              >
                <SpineCover size={60} />
                <View style={styles.loanInfo}>
                  <Text style={styles.loanTitle} numberOfLines={1}>{loan.bookRecord.title}</Text>
                  <View style={styles.patronRow}>
                    <Ionicons name="people-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.patronLabel}>Lent to </Text>
                    <Text style={styles.patronName}>{loan.contact.name}</Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: pill.bg }]}>
                    <Text style={[styles.pillText, { color: pill.color }]}>{pill.label}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.borderDark} />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="swap-horizontal-outline" size={64} color={colors.border} />
              <Text style={styles.emptyTitle}>No books out on loan</Text>
              <Text style={styles.emptySubtitle}>Lend a book from its detail page</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={historyGroups}
          keyExtractor={(g) => g.month}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            history.length > 0 ? (
              <View style={styles.statsRow}>
                <Text style={styles.statText}><Text style={styles.statBold}>{history.length}</Text> returned all-time</Text>
                {lateCount > 0 && (
                  <>
                    <View style={styles.dot} />
                    <Text style={[styles.statText, { color: colors.primaryDark, fontWeight: '600' }]}>{lateCount} returned late</Text>
                  </>
                )}
              </View>
            ) : null
          }
          renderItem={({ item: group }) => (
            <View>
              <View style={styles.monthHeader}>
                <Text style={styles.monthLabel}>{group.month}</Text>
                <View style={styles.monthLine} />
              </View>
              {group.items.map((loan) => {
                const pill = returnedPill(loan);
                const returnDate = loan.dateReturned ? new Date(loan.dateReturned) : null;
                const lentDate = new Date(loan.dateLent);
                const span = `${lentDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${returnDate ? returnDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '?'}`;
                return (
                  <TouchableOpacity
                    key={loan.id}
                    style={styles.historyCard}
                    onPress={() => router.push(`/library/${loan.copyId}`)}
                    activeOpacity={0.7}
                  >
                    <SpineCover size={54} />
                    <View style={styles.loanInfo}>
                      <Text style={styles.loanTitle} numberOfLines={1}>{loan.bookRecord.title}</Text>
                      <View style={styles.patronRow}>
                        <Ionicons name="people-outline" size={13} color={colors.textMuted} />
                        <Text style={styles.patronLabel}>Lent to </Text>
                        <Text style={styles.patronName}>{loan.contact.name}</Text>
                      </View>
                      <Text style={styles.spanText}>{span}</Text>
                    </View>
                    <View style={[styles.pill, { backgroundColor: pill.bg, alignSelf: 'flex-start' }]}>
                      <Text style={[styles.pillText, { color: pill.color }]}>{pill.label}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={64} color={colors.border} />
              <Text style={styles.emptyTitle}>No loan history yet</Text>
              <Text style={styles.emptySubtitle}>Returned loans will appear here</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const colors2 = colors as any;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  titleRow: { paddingHorizontal: 22, paddingTop: 6, paddingBottom: 2 },
  title: { fontSize: 34, fontWeight: '600', color: colors.text, letterSpacing: -0.3, fontFamily: 'Georgia' },
  segmented: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: 11, padding: 4, marginHorizontal: spacing.md, marginTop: 6 },
  segment: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  segmentActive: { backgroundColor: colors.background, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segmentText: { fontSize: 14, color: colors.textMuted },
  segmentTextActive: { fontWeight: '600', color: colors.text },
  list: { padding: spacing.md, gap: spacing.sm },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: 2, paddingBottom: spacing.xs },
  statText: { fontSize: 13, color: colors.textSecondary },
  statBold: { fontWeight: '700' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.border },
  loanCard: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: colors.surfaceCard, borderRadius: 14, borderWidth: 1, borderColor: colors.borderCard, padding: 12 },
  historyCard: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: colors.surfaceCard, borderRadius: 14, borderWidth: 1, borderColor: colors.borderCard, padding: 11, marginBottom: spacing.sm },
  loanInfo: { flex: 1, gap: 4 },
  loanTitle: { fontSize: 15.5, fontWeight: '600', color: colors.text, lineHeight: 19, fontFamily: 'Georgia' },
  patronRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  patronLabel: { fontSize: 13, color: colors.textMuted },
  patronName: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 14 },
  pillText: { fontSize: 11.5, fontWeight: '600' },
  spanText: { fontSize: 11.5, color: colors.textMuted },
  monthHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 5, marginBottom: spacing.sm },
  monthLabel: { fontSize: 11, fontWeight: '600', color: colors.primaryDark, textTransform: 'uppercase', letterSpacing: 1.2, fontFamily: 'Courier' },
  monthLine: { flex: 1, height: 1, backgroundColor: colors.border },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: spacing.md },
  emptySubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
});
