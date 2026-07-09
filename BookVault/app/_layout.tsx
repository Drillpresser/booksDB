import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '../src/theme';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { DisplayNameDialog } from '../src/components/DisplayNameDialog';

SplashScreen.preventAutoHideAsync();

function AppTabs() {
  const { loading, namePromptUserId, clearNamePrompt, authSheetOpen } = useAuth();

  useEffect(() => {
    if (loading) return;
    // Auth is ready — keep splash visible for a beat then dismiss
    const t = setTimeout(() => SplashScreen.hideAsync(), 1000);
    return () => clearTimeout(t);
  }, [loading]);

  return (
    <>
    <DisplayNameDialog visible={namePromptUserId !== null && !authSheetOpen} variant="prompt" onClose={clearNamePrompt} />
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, size }) => <Ionicons name="library-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="lending"
        options={{
          title: 'Lending',
          tabBarIcon: ({ color, size }) => <Ionicons name="swap-horizontal-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Patrons',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="shelves"
        options={{
          title: 'Shelves',
          tabBarIcon: ({ color, size }) => <Ionicons name="albums-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppTabs />
    </AuthProvider>
  );
}
