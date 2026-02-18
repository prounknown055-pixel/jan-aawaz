import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { playTap } from '../../lib/sounds';

const LEADER_TYPES = [
  { key: 'MLA', label: '🏛️ MLA', color: '#6366F1' },
  { key: 'MP', label: '🏛️ MP', color: '#8B5CF6' },
  { key: 'CM', label: '👑 Chief Minister', color: '#F59E0B' },
  { key: 'PM', label: '⭐ Prime Minister', color: '#FF6B35' },
  { key: 'President', label: '🌟 President', color: '#EF4444' },
  { key: 'VP', label: '🌟 Vice President', color: '#EC4899' },
  { key: 'DC', label: '🏢 District Collector', color: '#10B981' },
  { key: 'IAS', label: '🏢 IAS Officer', color: '#3B82F6' },
  { key: 'Sarpanch', label: '🏘️ Sarpanch', color: '#84CC16' },
  { key: 'Mayor', label: '🏙️ Mayor', color: '#06B6D4' },
  { key: 'Councillor', label: '🏘️ Councillor', color: '#94A3B8' },
];

export default function RequestBadge() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState(null);
  const [area, setArea] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [instaHandle, setInstaHandle] = useState('');
  const [instaPostUrl, setInstaPostUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    await playTap();
    if (!selectedType) { Alert.alert('Error', 'Leader type select karo.'); return; }
    if (!area.trim()) { Alert.alert('Error', 'Area naam likho.'); return; }
    if (!instaHandle.trim()) { Alert.alert('Error', 'Instagram handle likho.'); return; }
    if (!instaPostUrl.trim()) { Alert.alert('Error', 'Instagram post URL likho.'); return; }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('leader_requests').insert({
      user_id: user.id,
      leader_type: selectedType.key,
      area: area.trim(),
      state: state.trim(),
      district: district.trim(),
      insta_username: instaHandle.trim(),
      insta_post_url: instaPostUrl.trim(),
      badge_color: selectedType.color,
    });

    if (error) {
      Alert.alert('Error', 'Request nahi gayi. Dobara try karo.');
    } else {
      Alert.alert(
        '✅ Request Gayi!',
        'Admin verify karega. Aapke Instagram pe post dekh ke badge milega.',
        [{ text: 'Theek Hai', onPress: () => router.back() }]
      );
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={async () => { await playTap(); router.back(); }}>
            <Text style={styles.backBtn}>← Wapas</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={styles.headerIcon}>👑</Text>
          <Text style={styles.headerTitle}>Leader Badge Request</Text>
          <Text style={styles.headerSub}>
            Aap ek real leader hain? Verify karao aur badge pao.
          </Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>🔒 Kaise Hoga?</Text>
          <Text style={styles.infoText}>
            1. Apna leader type select karo{'\n'}
            2. Instagram par post karo ki ye aapka personal Jan Aawaz account hai{'\n'}
            3. Us post ka URL yahan do{'\n'}
            4. Admin verify karega aur badge dega
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Leader Type Select Karo *</Text>
          <View style={styles.typeGrid}>
            {LEADER_TYPES.map(type => (
              <TouchableOpacity
                key={type.key}
                style={[
                  styles.typeCard,
                  selectedType?.key === type.key && { borderColor: type.color, backgroundColor: type.color + '20' }
                ]}
                onPress={async () => { await playTap(); setSelectedType(type); }}
              >
                <Text style={styles.typeLabel}>{type.label}</Text>
                {selectedType?.key === type.key && (
                  <View style={[styles.typeCheck, { backgroundColor: type.color }]}>
                    <Text style={styles.typeCheckText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Area Details</Text>

          <Text style={styles.label}>Area/Constituency Naam *</Text>
          <TextInput
            style={styles.input}
            placeholder="Jaise: Varanasi, Lucknow..."
            placeholderTextColor="#475569"
            value={area}
            onChangeText={setArea}
          />

          <Text style={styles.label}>State</Text>
          <TextInput
            style={styles.input}
            placeholder="Jaise: Uttar Pradesh"
            placeholderTextColor="#475569"
            value={state}
            onChangeText={setState}
          />

          <Text style={styles.label}>District</Text>
          <TextInput
            style={styles.input}
            placeholder="Jaise: Varanasi"
            placeholderTextColor="#475569"
            value={district}
            onChangeText={setDistrict}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instagram Verification</Text>

          <Text style={styles.label}>Instagram Handle *</Text>
          <TextInput
            style={styles.input}
            placeholder="@aapka_instagram"
            placeholderTextColor="#475569"
            value={instaHandle}
            onChangeText={setInstaHandle}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Instagram Post URL *</Text>
          <TextInput
            style={styles.input}
            placeholder="https://instagram.com/p/..."
            placeholderTextColor="#475569"
            value={instaPostUrl}
            onChangeText={setInstaPostUrl}
            autoCapitalize="none"
          />
          <Text style={styles.hint}>
            💡 Post mein likho: "Ye mera personal Jan Aawaz account hai - @{instaHandle || 'aapka_handle'}"
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>👑 Request Bhejo</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  topBar: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 8 },
  backBtn: { fontSize: 14, color: '#FF6B35', fontWeight: '600' },
  header: { alignItems: 'center', padding: 24, paddingTop: 8 },
  headerIcon: { fontSize: 56, marginBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#F1F5F9', marginBottom: 8 },
  headerSub: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  infoBox: {
    backgroundColor: '#0F3460', borderRadius: 16, margin: 16,
    padding: 16, borderWidth: 1, borderColor: '#1E40AF',
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#60A5FA', marginBottom: 8 },
  infoText: { fontSize: 13, color: '#93C5FD', lineHeight: 22 },
  section: { padding: 16, paddingTop: 0, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#F1F5F9', marginBottom: 12 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeCard: {
    backgroundColor: '#1E293B', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 10, borderWidth: 1, borderColor: '#334155',
    position: 'relative',
  },
  typeLabel: { fontSize: 13, color: '#E2E8F0', fontWeight: '600' },
  typeCheck: {
    position: 'absolute', top: -6, right: -6, width: 18, height: 18,
    borderRadius: 9, alignItems: 'center', justifyContent: 'center',
  },
  typeCheckText: { fontSize: 10, color: '#fff', fontWeight: '900' },
  label: { fontSize: 13, color: '#94A3B8', marginBottom: 8, fontWeight: '600' },
  input: {
    backgroundColor: '#1E293B', borderRadius: 12, padding: 14,
    color: '#F1F5F9', fontSize: 15, borderWidth: 1, borderColor: '#334155', marginBottom: 14,
  },
  hint: { fontSize: 12, color: '#475569', marginTop: -8, marginBottom: 4, lineHeight: 18 },
  submitBtn: {
    backgroundColor: '#FF6B35', margin: 16, borderRadius: 20,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: '#FF6B35', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 17, color: '#fff', fontWeight: '700' },
});
