import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, AppState } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { configureGoogleSignin } from '../lib/auth';

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [maintenance, setMaintenance] = useState(false);
  const router = useRouter();

  useEffect(() => {
    initApp();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    return () => sub.remove();
  }, []);

  const initApp = async () => {
    try { configureGoogleSignin(); } catch (e) {}

    const fallback = setTimeout(() => {
      setAppReady(true);
      router.replace('/login');
    }, 4000);

    try {
      const { data: settings } = await supabase
        .from('app_settings')
        .select('maintenance_mode')
        .single();

      if (settings?.maintenance_mode) {
        clearTimeout(fallback);
        setMaintenance(true);
        setAppReady(true);
        return;
      }
    } catch (e) {}

    try {
      const { data: { session } } = await supabase.auth.getSession();
      clearTimeout(fallback);

      if (session) {
        const { data: user } = await supabase
          .from('users')
          .select('profile_setup_done, is_blocked')
          .eq('id', session.user.id)
          .single();

        if (user?.is_blocked) {
          await supabase.auth.signOut();
          router.replace('/login');
        } else if (!user?.profile_setup_done) {
          router.replace('/setup-profile');
        } else {
          router.replace('/(tabs)/home');
        }
      } else {
        router.replace('/login');
      }
    } catch (e) {
      clearTimeout(fallback);
      router.replace('/login');
    }

    setAppReady(true);
  };

  if (!appReady) {
    return (
      <View style={styles.splash}>
        <Text style={styles.flag}>🇮🇳</Text>
        <Text style={styles.title}>Jan Aawaz</Text>
        <Text style={styles.sub}>Awaaz Uthao, Badlaav Lao</Text>
      </View>
    );
  }

  if (maintenance) {
    return (
      <View style={styles.maintenance}>
        <Text style={styles.icon}>🔧</Text>
        <Text style={styles.mainTitle}>Jan Aawaz</Text>
        <Text style={styles.mainText}>
          App maintenance mein hai.{'\n'}Thodi der mein wapas aayein.
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
          <Stack.Screen name="leader/request-badge" />
          <Stack.Screen name="problem/add" />
          <Stack.Screen name="problem/[id]" />
          <Stack.Screen name="problem/area-problems" />
          <Stack.Screen name="protest/[id]" />
          <Stack.Screen name="protest/create" />
          <Stack.Screen name="protest/poll" />
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
  splash: {
    flex: 1, backgroundColor: '#0F172A',
    alignItems: 'center', justifyContent: 'center',
  },
  flag: { fontSize: 72, marginBottom: 20 },
  title: { fontSize: 38, fontWeight: '900', color: '#FF6B35', marginBottom: 8 },
  sub: { fontSize: 16, color: '#64748B' },
  maintenance: {
    flex: 1, backgroundColor: '#0F172A',
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  icon: { fontSize: 64, marginBottom: 16 },
  mainTitle: { fontSize: 32, fontWeight: '900', color: '#FF6B35', marginBottom: 12 },
  mainText: { fontSize: 16, color: '#94A3B8', textAlign: 'center', lineHeight: 26 },
});
