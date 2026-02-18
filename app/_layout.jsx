import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { configureGoogleSignin } from '../lib/auth';
import { loadSounds, unloadSounds } from '../lib/sounds';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, AppState } from 'react-native';

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [maintenance, setMaintenance] = useState(false);
  const router = useRouter();

  useEffect(() => {
    initApp();
    const sub = AppState.addEventListener('change', handleAppState);
    return () => {
      sub.remove();
      unloadSounds();
    };
  }, []);

  const handleAppState = (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  };

  const initApp = async () => {
    try {
      configureGoogleSignin();
      await loadSounds();

      const { data: settings } = await supabase
        .from('app_settings')
        .select('maintenance_mode')
        .single();

      if (settings?.maintenance_mode) {
        setMaintenance(true);
        setAppReady(true);
        await SplashScreen.hideAsync();
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        const { data: user } = await supabase
          .from('users')
          .select('profile_setup_done, role')
          .eq('id', session.user.id)
          .single();

        if (!user?.profile_setup_done) {
          router.replace('/setup-profile');
        } else if (user?.role === 'admin') {
          router.replace('/(tabs)/home');
        } else {
          router.replace('/(tabs)/home');
        }
      } else {
        router.replace('/login');
      }

      setAppReady(true);
      await SplashScreen.hideAsync();
    } catch (e) {
      setAppReady(true);
      await SplashScreen.hideAsync();
      router.replace('/login');
    }
  };

  if (!appReady) return null;

  if (maintenance) {
    return (
      <View style={styles.maintenance}>
        <Text style={styles.maintenanceIcon}>🔧</Text>
        <Text style={styles.maintenanceTitle}>Jan Aawaz</Text>
        <Text style={styles.maintenanceText}>
          App abhi maintenance mein hai.{'\n'}Thodi der mein wapas aayein.
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor="#0F172A" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="setup-profile" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="leader/[id]" />
          <Stack.Screen name="problem/add" />
          <Stack.Screen name="problem/[id]" />
          <Stack.Screen name="problem/area-problems" />
          <Stack.Screen name="protest/[id]" />
          <Stack.Screen name="protest/create" />
          <Stack.Screen name="chat/[userId]" />
          <Stack.Screen name="voting/annual-vote" />
          <Stack.Screen name="admin/dashboard" />
          <Stack.Screen name="admin/users" />
          <Stack.Screen name="admin/leaders" />
          <Stack.Screen name="admin/reports" />
          <Stack.Screen name="admin/payments" />
          <Stack.Screen name="admin/protests-admin" />
          <Stack.Screen name="admin/trending" />
          <Stack.Screen name="admin/settings" />
          <Stack.Screen name="admin/ads" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  maintenance: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  maintenanceIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  maintenanceTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FF6B35',
    marginBottom: 12,
  },
  maintenanceText: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 26,
  },
});
