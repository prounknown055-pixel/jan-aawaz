import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { playTap } from '../lib/sounds';

export default function SetupProfile() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  const validateUsername = (text) => {
    const clean = text.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(clean);
    if (clean.length < 3) {
      setUsernameError('Username kam se kam 3 characters ka hona chahiye');
    } else if (clean.length > 20) {
      setUsernameError('Username maximum 20 characters ka ho sakta hai');
    } else {
      setUsernameError('');
    }
  };

  const handleSave = async () => {
    await playTap();
    if (!name.trim() || name.trim().length < 2) {
      Alert.alert('Error', 'Apna naam sahi se likho');
      return;
    }
    if (!username || username.length < 3) {
      Alert.alert('Error', 'Username kam se kam 3 characters ka hona chahiye');
      return;
    }
    if (usernameError) {
      Alert.alert('Error', usernameError);
      return;
    }

    setLoading(true);

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existing) {
      Alert.alert('Error', 'Ye username already le liya gaya hai. Dusra try karo.');
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('users')
      .update({
        name: name.trim(),
        username,
        profile_setup_done: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      Alert.alert('Error', 'Profile save nahi ho paya. Dobara try karo.');
      setLoading(false);
      return;
    }

    router.replace('/(tabs)/home');
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.emoji}>👤</Text>
        <Text style={styles.title}>Apna Profile Banao</Text>
        <Text style={styles.subtitle}>Sirf ek baar karna hai</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Apna Naam *</Text>
          <TextInput
            style={styles.input}
            placeholder="Jaise: Rahul Kumar"
            placeholderTextColor="#475569"
            value={name}
            onChangeText={setName}
            maxLength={50}
          />

          <Text style={styles.label}>Username * (unique ID)</Text>
          <TextInput
            style={[styles.input, usernameError ? styles.inputError : null]}
            placeholder="Jaise: rahul_kumar"
            placeholderTextColor="#475569"
            value={username}
            onChangeText={validateUsername}
            maxLength={20}
            autoCapitalize="none"
          />
          {usernameError ? (
            <Text style={styles.errorText}>{usernameError}</Text>
          ) : (
            <Text style={styles.hintText}>
              Only letters, numbers, underscore. Baad mein change nahi hoga.
            </Text>
          )}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>🔒 Aapki Privacy</Text>
          <Text style={styles.infoText}>
            • Aapka email sirf admin ko dikh sakta hai{'\n'}
            • Problems anonymous post hogi{'\n'}
            • Koi bhi aapka real ID nahi dekh sakta
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>App Mein Jaao →</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  scroll: { flexGrow: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '900', color: '#F1F5F9', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#64748B', marginBottom: 32 },
  card: {
    width: '100%', backgroundColor: '#1E293B',
    borderRadius: 20, padding: 20, marginBottom: 20,
  },
  label: { fontSize: 13, color: '#94A3B8', marginBottom: 8, fontWeight: '600' },
  input: {
    backgroundColor: '#0F172A', borderRadius: 12,
    padding: 14, color: '#F1F5F9', fontSize: 16,
    borderWidth: 1, borderColor: '#334155', marginBottom: 16,
  },
  inputError: { borderColor: '#EF4444' },
  errorText: { fontSize: 12, color: '#EF4444', marginTop: -12, marginBottom: 12 },
  hintText: { fontSize: 11, color: '#475569', marginTop: -12, marginBottom: 4 },
  infoBox: {
    width: '100%', backgroundColor: '#0F3460',
    borderRadius: 16, padding: 16, marginBottom: 28,
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#60A5FA', marginBottom: 8 },
  infoText: { fontSize: 13, color: '#93C5FD', lineHeight: 22 },
  saveBtn: {
    backgroundColor: '#FF6B35', paddingVertical: 16,
    paddingHorizontal: 48, borderRadius: 50, width: '100%', alignItems: 'center',
    shadowColor: '#FF6B35', shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 8 }, shadowRadius: 16, elevation: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});
