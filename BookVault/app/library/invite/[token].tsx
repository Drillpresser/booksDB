import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../../src/theme';
import { useAuth } from '../../../src/contexts/AuthContext';
import { AuthSheet } from '../../../src/components/AuthSheet';
import { getInviteByToken, claimInvite } from '../../../src/services/library';
import type { Library } from '../../../src/services/library';

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [library, setLibrary] = useState<Library | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [authVisible, setAuthVisible] = useState(false);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (!token) { setInvalid(true); setLoading(false); return; }
    getInviteByToken(token)
      .then((result) => {
        if (!result) { setInvalid(true); }
        else { setLibrary(result.library); }
      })
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleClaim() {
    if (!user) { setAuthVisible(true); return; }
    if (!token) return;
    setClaiming(true);
    try {
      await claimInvite(token);
      setClaimed(true);
    } catch (e: any) {
      const msg = e?.message ?? '';
      if (msg.includes('duplicate') || msg.includes('unique')) {
        Alert.alert('Already a Member', 'You already have access to this shelf.', [
          { text: 'View Shelf', onPress: () => router.replace(`/library/view/${library!.id}`) },
        ]);
      } else {
        Alert.alert('Error', 'Could not claim this invite. It may have already been used.');
      }
    } finally {
      setClaiming(false);
    }
  }

  if (loading || authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (invalid) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Invalid Invite' }} />
        <View style={styles.center}>
          <Ionicons name="close-circle-outline" size={64} color={colors.danger} />
          <Text style={styles.headingText}>Invite Not Found</Text>
          <Text style={styles.subText}>
            This invite link is invalid or has already been used.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (claimed && library) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Welcome!' }} />
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={64} color={colors.success} />
          <Text style={styles.headingText}>You're In!</Text>
          <Text style={styles.subText}>
            You now have a Shelf Card for <Text style={{ fontWeight: '700' }}>{library.name}</Text>.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.replace(`/library/view/${library.id}`)}
          >
            <Text style={styles.primaryBtnText}>Browse the Shelf</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Shelf Invite' }} />
      <View style={styles.center}>
        <View style={styles.libraryBadge}>
          <Ionicons name="library" size={40} color={colors.primary} />
        </View>
        <Text style={styles.headingText}>You're Invited!</Text>
        <Text style={styles.libraryName}>{library?.name}</Text>
        {library?.description ? (
          <Text style={styles.libraryDesc}>{library.description}</Text>
        ) : null}

        {!user ? (
          <>
            <Text style={styles.subText}>Sign in to claim your Shelf Card.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setAuthVisible(true)}>
              <Text style={styles.primaryBtnText}>Sign In to Continue</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.subText}>
              Claim your Shelf Card to browse books and request checkouts.
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, claiming && { opacity: 0.6 }]}
              onPress={handleClaim}
              disabled={claiming}
            >
              {claiming
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>Claim Shelf Card</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>

      <AuthSheet visible={authVisible} onClose={() => setAuthVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  libraryBadge: { width: 80, height: 80, borderRadius: radius.lg, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
  headingText: { fontSize: 24, fontWeight: '700', color: colors.text, textAlign: 'center' },
  libraryName: { fontSize: 20, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  libraryDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  subText: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, marginTop: spacing.sm },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
