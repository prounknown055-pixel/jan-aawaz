import { useEffect, useState, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, AppState, Animated, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { configureGoogleSignin } from '../lib/auth';

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [maintenance, setMaintenance] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [destination, setDestination] = useState('/login');
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const btnAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 900, useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1, tension: 40, friction: 7, useNativeDriver: true,
      }),
    ]).start();

    initApp();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    return () => sub.remove();
  }, []);

  const showWelcomeButton = (dest) => {
    setDestination(dest);
    setShowButton(true);
    Animated.timing(btnAnim, {
      toValue: 1, duration: 600, useNativeDriver: true,
    }).start();
  };

  const initApp = async () => {
    try { configureGoogleSignin(); } catch (e) {}

    try {
      const { data: settings } = await supabase
        .from('app_settings')
        .select('maintenance_mode')
        .single();

      if (settings?.maintenance_mode) {
        setMaintenance(true);
        setAppReady(true);
        return;
      }
    } catch (e) {}

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        const { data: user } = await supabase
          .from('users')
          .select('profile_setup_done, is_blocked')
          .eq('id', session.user.id)
          .single();

        if (user?.is_blocked) {
          await supabase.auth.signOut();
          showWelcomeButton('/login');
        } else if (!user?.profile_setup_done) {
          showWelcomeButton('/setup-profile');
        } else {
          // Already logged in — seedha home
          showWelcomeButton('/(tabs)/home');
        }
      } else {
        showWelcomeButton('/login');
      }
    } catch (e) {
      showWelcomeButton('/login');
    }

    setAppReady(true);
  };

  const handleWelcomePress = () => {
    router.replace(destination);
  };

  if (!appReady) {
    return (
      <View style={styles.splash}>
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
          alignItems: 'center',
        }}>
          <Text style={styles.flag}>🇮🇳</Text>
          <Text style={styles.title}>Jan Aawaz</Text>
          <Text style={styles.sub}>Awaaz Uthao, Badlaav Lao</Text>
        </Animated.View>
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

  if (showButton) {
    return (
      <View style={styles.splash}>
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
          alignItems: 'center',
          width: '100%',
          paddingHorizontal: 32,
        }}>
          <Text style={styles.flag}>🇮🇳</Text>
          <Text style={styles.title}>Jan Aawaz</Text>
          <Text style={styles.sub}>Awaaz Uthao, Badlaav Lao</Text>

          <Animated.View style={{ opacity: btnAnim, width: '100%', marginTop: 60 }}>
            <TouchableOpacity
              style={styles.welcomeBtn}
              onPress={handleWelcomePress}
              activeOpacity={0.85}
            >
              <Text style={styles.welcomeBtnText}>
                {destination === '/login' ? '🚀 Shuru Karo' : '🏠 Aage Badho'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.tagline}>
              {destination === '/login'
                ? 'India ki awaaz bano'
                : 'Wapas aaye! Namaste 🙏'}
            </Text>
          </Animated.View>
        </Animated.View>
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
  flag: { fontSize: 80, marginBottom: 20 },
  title: {
    fontSize: 42, fontWeight: '900',
    color: '#FF6B35', marginBottom: 8, letterSpacing: 1,
  },
  sub: { fontSize: 16, color: '#64748B', letterSpacing: 0.5 },
  welcomeBtn: {
    backgroundColor: '#FF6B35',
    paddingVertical: 18,
    borderRadius: 32,
    alignItems: 'center',
    width: '100%',
    elevation: 8,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  welcomeBtnText: {
    fontSize: 18, fontWeight: '900',
    color: '#fff', letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 14, color: '#64748B',
    textAlign: 'center', marginTop: 16,
  },
  maintenance: {
    flex: 1, backgroundColor: '#0F172A',
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  icon: { fontSize: 64, marginBottom: 16 },
  mainTitle: { fontSize: 32, fontWeight: '900', color: '#FF6B35', marginBottom: 12 },
  mainText: { fontSize: 16, color: '#94A3B8', textAlign: 'center', lineHeight: 26 },
});
