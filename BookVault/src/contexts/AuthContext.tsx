import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '../lib/supabase';
import { getPreference, setPreference } from '../database/queries/preferences';

WebBrowser.maybeCompleteAuthSession();

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  // User id to prompt for a display name after a fresh sign-in (once per account)
  namePromptUserId: string | null;
  clearNamePrompt: () => void;
  // True while the AuthSheet modal is natively presented; the name prompt must
  // wait for it to dismiss or iOS tears the prompt down with the sheet
  authSheetOpen: boolean;
  setAuthSheetOpen: (open: boolean) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null, session: null, loading: true,
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => ({ needsConfirmation: false }),
  signOut: async () => {},
  deleteAccount: async () => {},
  namePromptUserId: null,
  clearNamePrompt: () => {},
  authSheetOpen: false,
  setAuthSheetOpen: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [namePromptUserId, setNamePromptUserId] = useState<string | null>(null);
  const [authSheetOpen, setAuthSheetOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      // Offer a display-name change once per account on the first real sign-in
      // (INITIAL_SESSION on cold start / TOKEN_REFRESHED are ignored on purpose)
      if (event === 'SIGNED_IN' && s?.user && getPreference(`name_prompted_${s.user.id}`, '') !== '1') {
        setNamePromptUserId(s.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  function clearNamePrompt() {
    if (namePromptUserId) setPreference(`name_prompted_${namePromptUserId}`, '1');
    setNamePromptUserId(null);
  }

  async function signInWithGoogle() {
    const redirectUri = __DEV__
      ? Linking.createURL('auth/callback')
      : makeRedirectUri({ scheme: 'bookvault', path: 'auth/callback' });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUri, skipBrowserRedirect: true },
    });

    if (error || !data.url) {
      Alert.alert('Sign in failed', error?.message ?? 'Could not start Google sign in.');
      return;
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
    if (result.type === 'success') {
      // Tokens arrive in the URL fragment after Supabase processes the OAuth callback
      const fragment = result.url.split('#')[1] ?? '';
      const params = new URLSearchParams(fragment);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
      }
    }
  }

  async function signInWithApple() {
    if (Platform.OS !== 'ios') return;
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        Alert.alert('Sign in failed', 'No identity token returned from Apple.');
        return;
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) {
        Alert.alert('Sign in failed', error.message);
        return;
      }

      // Apple only provides the name on the first authorization — persist it now or lose it
      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean).join(' ');
      if (fullName && !data.user?.user_metadata?.full_name) {
        await supabase.auth.updateUser({ data: { full_name: fullName } });
      }
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Sign in failed', e.message ?? 'Apple sign in failed.');
      }
    }
  }

  async function signInWithEmail(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  }

  async function signUpWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) throw error;
    // With email confirmation on, signUp returns no session until the link is clicked
    return { needsConfirmation: !data.session };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function deleteAccount() {
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
    if (error) {
      throw new Error(error.message ?? 'Could not delete account.');
    }
    // The server-side user is already gone; only clear the local session
    await supabase.auth.signOut({ scope: 'local' });
  }

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, session, loading, signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail, signOut, deleteAccount, namePromptUserId, clearNamePrompt, authSheetOpen, setAuthSheetOpen }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
