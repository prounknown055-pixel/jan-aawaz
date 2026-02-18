import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Switch
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { playTap } from '../../lib/sounds';

export default function AdminSettings() {
  const router = useRouter();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    const { data } = await supabase.from('app_settings').select('*').single();
    setSettings(data);
    setLoading(false);
  };

  const handleSave = async () => {
    await playTap();
    setSaving(true);
    const { error } = await supabase
      .from('app_settings')
      .update({
        chat_enabled: settings.chat_enabled,
        protest_creation_enabled: settings.protest_creation_enabled,
        voting_enabled: settings.voting_enabled,
        map_enabled: settings.map_enabled,
        ads_enabled: settings.ads_enabled,
        background_music_enabled: settings.background_music_enabled,
        tap_sound_enabled: settings.tap_sound_enabled,
        protest_creation_fee: parseInt(settings.protest_creation_fee) || 100000,
        upi_id: settings.upi_id,
        voting_open: settings.voting_open,
        leader_voting_open: settings.leader_voting_open,
        world_chat_lines_per_day: parseInt(settings.world_chat_lines_per_day) || 5,
        problems_per_week: parseInt(settings.problems_per_week) || 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id);

    if (error) {
      Alert.alert('Error', 'Settings save nahi hui.');
    } else {
      Alert.alert('✅ Saved!', 'Settings save ho gayi.');
    }
    setSaving(false);
  };

  const toggleSetting = async (key) => {
    await playTap();
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  const toggleItems = [
    { key: 'chat_enabled', label: '💬 World Chat', icon: '💬' },
    { key: 'protest_creation_enabled', label: '✊ Protest Creation', icon: '✊' },
    { key: 'voting_open', label: '🗳️ Annual Voting Open', icon: '🗳️' },
    { key: 'leader_voting_open', label: '👑 Leader Self Voting', icon: '👑' },
    { key: 'map_enabled', label: '🗺️ Map Feature', icon: '🗺️' },
    { key: 'ads_enabled', label: '📢 Ads Show Karo', icon: '📢' },
    { key: 'tap_sound_enabled', label: '🔊 Tap Sound', icon: '🔊' },
    { key: 'background_music_enabled', label: '🎵 Background Music', icon: '🎵' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={async () => { await playTap(); router.back(); }}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>⚙️ App Settings</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Toggle Settings */}
        <Text style={styles.sectionTitle}>🔧 Features On/Off</Text>
        <View style={styles.togglesCard}>
          {toggleItems.map((item, i) => (
            <View key={item.key} style={[styles.toggleRow, i < toggleItems.length - 1 && styles.toggleRowBorder]}>
              <Text style={styles.toggleLabel}>{item.label}</Text>
              <Switch
                value={settings?.[item.key] || false}
                onValueChange={() => toggleSetting(item.key)}
                trackColor={{ false: '#334155', true: '#FF6B35' }}
                thumbColor={settings?.[item.key] ? '#fff' : '#64748B'}
              />
            </View>
          ))}
        </View>

        {/* Payment Settings */}
        <Text style={styles.sectionTitle}>💳 Payment Settings</Text>
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>UPI ID</Text>
          <TextInput
            style={styles.input}
            value={settings?.upi_id || ''}
            onChangeText={(text) => setSettings(prev => ({ ...prev, upi_id: text }))}
            placeholder="example@upi"
            placeholderTextColor="#475569"
            autoCapitalize="none"
          />

          <Text style={styles.inputLabel}>Protest Creation Fee (paise mein)</Text>
          <TextInput
            style={styles.input}
            value={String(settings?.protest_creation_fee || '')}
            onChangeText={(text) => setSettings(prev => ({ ...prev, protest_creation_fee: text }))}
            placeholder="100000 = ₹1000"
            placeholderTextColor="#475569"
            keyboardType="numeric"
          />
          <Text style={styles.hint}>
            Current Fee: ₹{((settings?.protest_creation_fee || 0) / 100).toFixed(0)}
          </Text>
        </View>

        {/* Limits */}
        <Text style={styles.sectionTitle}>📊 Limits</Text>
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>World Chat Messages Per Day</Text>
          <TextInput
            style={styles.input}
            value={String(settings?.world_chat_lines_per_day || '')}
            onChangeText={(text) => setSettings(prev => ({ ...prev, world_chat_lines_per_day: text }))}
            keyboardType="numeric"
            placeholderTextColor="#475569"
          />

          <Text style={styles.inputLabel}>Problems Per Week</Text>
          <TextInput
            style={styles.input}
            value={String(settings?.problems_per_week || '')}
            onChangeText={(text) => setSettings(prev => ({ ...prev, problems_per_week: text }))}
            keyboardType="numeric"
            placeholderTextColor="#475569"
          />
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ Admin Info</Text>
          <Text style={styles.infoText}>
            • Admin Email: prounknown055@gmail.com{'\n'}
            • Voting Jan 1 ko automatically open hoti hai{'\n'}
            • Maintenance mode ON karne se sirf admin access kar sakta hai{'\n'}
            • Sab changes real-time apply hote hain
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  loadingContainer: { flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  backBtn: { fontSize: 14, color: '#FF6B35', fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#F1F5F9' },
  saveBtn: { backgroundColor: '#FF6B35', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  saveBtnText: { fontSize: 14, color: '#fff', fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#F1F5F9', paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  togglesCard: {
    backgroundColor: '#1E293B', marginHorizontal: 16, borderRadius: 16,
    borderWidth: 1, borderColor: '#334155',
  },
  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  toggleRowBorder: { borderBottomWidth: 1, borderBottomColor: '#334155' },
  toggleLabel: { fontSize: 14, color: '#E2E8F0', fontWeight: '600' },
  inputCard: {
    backgroundColor: '#1E293B', marginHorizontal: 16, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: '#334155',
  },
  inputLabel: { fontSize: 13, color: '#94A3B8', marginBottom: 8, fontWeight: '600' },
  input: {
    backgroundColor: '#0F172A', borderRadius: 10, padding: 12,
    color: '#F1F5F9', fontSize: 14, borderWidth: 1, borderColor: '#334155', marginBottom: 12,
  },
  hint: { fontSize: 12, color: '#FF6B35', marginTop: -8, marginBottom: 4 },
  infoBox: {
    backgroundColor: '#0F3460', margin: 16, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#1E40AF',
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#60A5FA', marginBottom: 8 },
  infoText: { fontSize: 13, color: '#93C5FD', lineHeight: 22 },
});
