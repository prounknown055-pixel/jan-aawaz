import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function AdminLayout() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/login'); return; }
    const { data } = await supabase
      .from('users').select('role, email').eq('id', user.id).single();
    if (data?.role === 'admin' || data?.email === 'prounknown055@gmail.com') {
      setAllowed(true);
    } else {
      router.replace('/(tabs)/home');
    }
    setChecking(false);
  };

  if (checking) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Admin verify ho raha hai...</Text>
      </View>
    );
  }

  if (!allowed) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="users" />
      <Stack.Screen name="leaders" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="payments" />
      <Stack.Screen name="protests-admin" />
      <Stack.Screen name="trending" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="ads" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1, backgroundColor: '#0F172A',
    alignItems: 'center', justifyContent: 'center',
  },
  loadingText: { color: '#64748B', marginTop: 12, fontSize: 14 },
});
