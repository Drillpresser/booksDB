import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { AuthSheet } from './AuthSheet';
import { getRatingsForIsbn, upsertRating, deleteRating, RatingSummary } from '../services/ratings';

type Props = {
  isbn: string;
  localRating: number | null;
  onLocalRating: (star: number) => void;
};

export function CommunityRatings({ isbn, localRating, onLocalRating }: Props) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<RatingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [authVisible, setAuthVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [pendingStar, setPendingStar] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [isbn, user?.id]);

  async function load() {
    setLoading(true);
    try {
      const data = await getRatingsForIsbn(isbn, user?.id);
      setSummary(data);
      if (data.myRating) {
        setPendingStar(data.myRating.stars);
        setReviewText(data.myRating.review ?? '');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleStarPress(star: number) {
    if (!user) {
      // Not signed in — save locally
      onLocalRating(star);
      return;
    }
    setPendingStar(star);
    setReviewModalVisible(true);
  }

  async function submitRating() {
    if (!user || !pendingStar) return;
    setSaving(true);
    try {
      await upsertRating(isbn, pendingStar, reviewText.trim() || null, user.id);
      setReviewModalVisible(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!user || !summary?.myRating) return;
    setSaving(true);
    try {
      await deleteRating(isbn, user.id);
      setPendingStar(0);
      setReviewText('');
      setReviewModalVisible(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  const myRating = summary?.myRating;
  // Signed in: show community rating. Signed out: show local rating.
  const displayedStars = user ? (myRating?.stars ?? pendingStar) : (localRating ?? 0);
  const ratingLabel = user
    ? (myRating ? 'Your rating' : 'Rate this book')
    : (localRating ? 'Your rating (local)' : 'Rate this book');

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Community Ratings</Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <>
          <View style={styles.summaryRow}>
            <StarDisplay rating={summary?.average ?? 0} size={22} />
            <Text style={styles.avgText}>
              {summary && summary.count > 0
                ? `${summary.average.toFixed(1)}  ·  ${summary.count} ${summary.count === 1 ? 'rating' : 'ratings'}`
                : 'No ratings yet'}
            </Text>
          </View>

          <View style={styles.myRatingRow}>
            <Text style={styles.myRatingLabel}>{ratingLabel}</Text>
            <View style={styles.interactiveStars}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => handleStarPress(s)} hitSlop={6}>
                  <Ionicons
                    name={s <= displayedStars ? 'star' : 'star-outline'}
                    size={28}
                    color={s <= displayedStars ? colors.stars : colors.border}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {!user && (
              <TouchableOpacity onPress={() => setAuthVisible(true)}>
                <Text style={styles.signInLink}>Sign in to share your rating</Text>
              </TouchableOpacity>
            )}
          </View>

          {summary && summary.count > 0 && (
            <TouchableOpacity style={styles.expandBtn} onPress={() => setExpanded((v) => !v)}>
              <Text style={styles.expandBtnText}>
                {expanded ? 'Hide reviews' : `See all ${summary.count} reviews`}
              </Text>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
            </TouchableOpacity>
          )}

          {expanded && summary?.ratings.map((r) => (
            <View key={r.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{r.displayName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.reviewMeta}>
                  <Text style={styles.reviewName}>{r.displayName}</Text>
                  <StarDisplay rating={r.stars} size={14} />
                </View>
                <Text style={styles.reviewDate}>{formatDate(r.createdAt)}</Text>
              </View>
              {r.review ? <Text style={styles.reviewText}>{r.review}</Text> : null}
            </View>
          ))}
        </>
      )}

      <AuthSheet visible={authVisible} onClose={() => { setAuthVisible(false); load(); }} />

      <Modal visible={reviewModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{myRating ? 'Edit your rating' : 'Rate this book'}</Text>
            <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
              <Ionicons name="close" size={26} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <View style={styles.modalStars}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setPendingStar(s)}>
                  <Ionicons
                    name={s <= pendingStar ? 'star' : 'star-outline'}
                    size={40}
                    color={s <= pendingStar ? colors.stars : colors.border}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.reviewInput}
              placeholder="Write a review (optional)..."
              placeholderTextColor={colors.textSecondary}
              value={reviewText}
              onChangeText={setReviewText}
              multiline
              numberOfLines={4}
            />
            <TouchableOpacity style={styles.submitBtn} onPress={submitRating} disabled={saving || !pendingStar}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Save Rating</Text>}
            </TouchableOpacity>
            {myRating && (
              <TouchableOpacity style={styles.deleteRatingBtn} onPress={handleDelete} disabled={saving}>
                <Text style={styles.deleteRatingBtnText}>Remove my rating</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function StarDisplay({ rating, size }: { rating: number; size: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons
          key={s}
          name={s <= Math.round(rating) ? 'star' : 'star-outline'}
          size={size}
          color={colors.stars}
        />
      ))}
    </View>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avgText: { fontSize: 15, color: colors.text, fontWeight: '600' },
  myRatingRow: { gap: spacing.xs },
  myRatingLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  interactiveStars: { flexDirection: 'row', gap: spacing.xs },
  signInLink: { fontSize: 13, color: colors.accent, fontWeight: '600', marginTop: spacing.xs },
  expandBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
  expandBtnText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  reviewCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: colors.accent, fontWeight: '700', fontSize: 16 },
  reviewMeta: { flex: 1, gap: 2 },
  reviewName: { fontSize: 14, fontWeight: '600', color: colors.text },
  reviewDate: { fontSize: 12, color: colors.textSecondary },
  reviewText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  modalBody: { padding: spacing.md, gap: spacing.md },
  modalStars: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.md },
  reviewInput: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 15, color: colors.text, minHeight: 100, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  deleteRatingBtn: { alignItems: 'center', padding: spacing.sm },
  deleteRatingBtnText: { color: colors.danger, fontSize: 14 },
});
