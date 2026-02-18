import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, Switch
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { addProblem, checkWeeklyProblemLimit, incrementWeeklyProblemCount } from '../../lib/supabase';
import { generateProblemSummary } from '../../lib/ai';
import { playTap } from '../../lib/sounds';

const CATEGORIES = [
  { key: 'roads', label: '🛣️ Sadak', color: '#F59E0B' },
  { key: 'water', label: '💧 Paani', color: '#3B82F6' },
  { key: 'electricity', label: '⚡ Bijli', color: '#EAB308' },
  { key: 'corruption', label: '💰 Bhrashtachar', color: '#EF4444' },
  { key: 'women_safety', label: '🛡️ Mahila Suraksha', color: '#EC4899' },
  { key: 'health', label: '🏥 Swasthya', color: '#10B981' },
  { key: 'education', label: '📚 Shiksha', color: '#8B5CF6' },
  { key: 'crime', label: '🚨 Apradh', color: '#F97316' },
  { key: 'political', label: '🏛️ Rajneeti', color: '#6366F1' },
  { key: 'environment', label: '🌿 Paryavaran', color: '#84CC16' },
  { key: 'scam', label: '💸 Ghotala', color: '#EF4444' },
  { key: 'other', label: '📌 Anya', color: '#94A3B8' },
];

export default function AddProblem() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(null);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [location, setLocation] = useState(null);
  const [area, setArea] = useState('');
  const [village, setVillage] = useState('');
  const [block, setBlock] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data } = await supabase.from('users').select('*').eq('id', authUser.id).single();
      setUser(data);
    }
  };

  const getLocation = async () => {
    await playTap();
    setLocationLoading(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Nahi Mili', 'Location access do settings mein.');
      setLocationLoading(false);
      return;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setLocation(loc.coords);

    try {
      const geocode = await Location.reverseGeocodeAsync(loc.coords);
      if (geocode[0]) {
        const g = geocode[0];
        setArea(g.subregion || g.city || '');
        setDistrict(g.city || g.subregion || '');
        setState(g.region || '');
        setVillage(g.district || '');
      }
    } catch (e) {}
    setLocationLoading(false);
  };

  const handleSubmit = async () => {
    await playTap();
    if (!title.trim()) { Alert.alert('Error', 'Title likhna zaroori hai.'); return; }
    if (!category) { Alert.alert('Error', 'Category select karo.'); return; }
    if (!location) { Alert.alert('Error', 'Location set karo.'); return; }

    const descWords = description.trim().split(/\s+/).length;
    if (description.trim() && descWords > 100) {
      Alert.alert('Error', 'Description maximum 100 words ka hona chahiye.');
      return;
    }

    setLoading(true);

    const limitReached = await checkWeeklyProblemLimit(user.id);
    if (limitReached) {
      Alert.alert('Limit Ho Gayi', 'Is hafte aap 1 problem post kar chuke ho. Agli hafte dobara aao.');
      setLoading(false);
      return;
    }

    const aiSummary = await generateProblemSummary(title, description);

    const { data, error } = await addProblem({
      user_id: user.id,
      title: title.trim(),
      description: description.trim(),
      category: category.key,
      latitude: location.latitude,
      longitude: location.longitude,
      area_name: area.trim(),
      village: village.trim(),
      block: block.trim(),
      district: district.trim(),
      state: state.trim(),
      country: 'India',
      video_url: videoUrl.trim() || null,
      is_anonymous: isAnonymous,
      ai_summary: aiSummary || null,
    });

    if (error) {
      Alert.alert('Error', 'Problem post nahi ho paya. Dobara try karo.');
      setLoading(false);
      return;
    }

    await incrementWeeklyProblemCount(user.id);

    Alert.alert(
      '✅ Problem Post Ho Gayi!',
      'Aapki problem map aur feed par dikh rahi hai.',
      [{ text: 'Theek Hai', onPress: () => router.back() }]
    );
    setLoading(false);
  };

  const wordCount = description.trim() ? description.trim().split(/\s+/).length : 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={async () => { await playTap(); router.back(); }}>
            <Text style={styles.backBtn}>← Wapas</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Problem Post Karo</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.weeklyLimitBox}>
          <Text style={styles.weeklyLimitText}>
            ⚠️ Is hafte sirf 1 problem post kar sakte ho. Soch samajh ke likho.
          </Text>
        </View>

        {/* Anonymous Toggle */}
        <View style={styles.anonRow}>
          <View>
            <Text style={styles.anonTitle}>🎭 Anonymous Post</Text>
            <Text style={styles.anonSub}>Naam nahi dikhega kisi ko</Text>
          </View>
          <Switch
            value={isAnonymous}
            onValueChange={setIsAnonymous}
            trackColor={{ false: '#334155', true: '#FF6B35' }}
            thumbColor={isAnonymous ? '#fff' : '#64748B'}
          />
        </View>

        {/* Title */}
        <View style={styles.fieldBox}>
          <Text style={styles.label}>Problem Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Jaise: Hamare mohalle mein pani nahi aata"
            placeholderTextColor="#475569"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          <Text style={styles.charCount}>{title.length}/100</Text>
        </View>

        {/* Category */}
        <View style={styles.fieldBox}>
          <Text style={styles.label}>Category Select Karo *</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.catCard,
                  category?.key === cat.key && { borderColor: cat.color, backgroundColor: cat.color + '20' }
                ]}
                onPress={async () => { await playTap(); setCategory(cat); }}
              >
                <Text style={[styles.catLabel, category?.key === cat.key && { color: cat.color }]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description */}
        <View style={styles.fieldBox}>
          <Text style={styles.label}>Description (max 100 words)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Problem ke baare mein thoda batao..."
            placeholderTextColor="#475569"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
          <Text style={[styles.charCount, wordCount > 100 && { color: '#EF4444' }]}>
            {wordCount}/100 words
          </Text>
        </View>

        {/* Video URL */}
        <View style={styles.fieldBox}>
          <Text style={styles.label}>Video URL (YouTube - max 60 sec)</Text>
          <TextInput
            style={styles.input}
            placeholder="https://youtube.com/..."
            placeholderTextColor="#475569"
            value={videoUrl}
            onChangeText={setVideoUrl}
            autoCapitalize="none"
          />
          <Text style={styles.hint}>💡 YouTube par unlisted video upload karo aur link yahan do</Text>
        </View>

        {/* Location */}
        <View style={styles.fieldBox}>
          <Text style={styles.label}>Location *</Text>
          <TouchableOpacity
            style={[styles.locationBtn, location && styles.locationBtnActive]}
            onPress={getLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator color="#FF6B35" />
            ) : (
              <Text style={[styles.locationBtnText, location && { color: '#10B981' }]}>
                {location ? '✅ Location Set Hai' : '📍 Location Set Karo'}
              </Text>
            )}
          </TouchableOpacity>

          {location && (
            <View style={styles.locationInfo}>
              <Text style={styles.locationCoords}>
                {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </Text>
            </View>
          )}

          <View style={styles.locationFields}>
            <View style={styles.locationFieldHalf}>
              <Text style={styles.subLabel}>Village/Ward</Text>
              <TextInput
                style={styles.inputSmall}
                placeholder="Village..."
                placeholderTextColor="#475569"
                value={village}
                onChangeText={setVillage}
              />
            </View>
            <View style={styles.locationFieldHalf}>
              <Text style={styles.subLabel}>Block/Tehsil</Text>
              <TextInput
                style={styles.inputSmall}
                placeholder="Block..."
                placeholderTextColor="#475569"
                value={block}
                onChangeText={setBlock}
              />
            </View>
          </View>

          <View style={styles.locationFields}>
            <View style={styles.locationFieldHalf}>
              <Text style={styles.subLabel}>District</Text>
              <TextInput
                style={styles.inputSmall}
                placeholder="District..."
                placeholderTextColor="#475569"
                value={district}
                onChangeText={setDistrict}
              />
            </View>
            <View style={styles.locationFieldHalf}>
              <Text style={styles.subLabel}>State</Text>
              <TextInput
                style={styles.inputSmall}
                placeholder="State..."
                placeholderTextColor="#475569"
                value={state}
                onChangeText={setState}
              />
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>📢 Problem Post Karo</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  backBtn: { fontSize: 14, color: '#FF6B35', fontWeight: '600' },
  topBarTitle: { fontSize: 17, fontWeight: '800', color: '#F1F5F9' },
  weeklyLimitBox: {
    backgroundColor: '#F59E0B10', margin: 16, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#F59E0B30',
  },
  weeklyLimitText: { fontSize: 13, color: '#F59E0B', textAlign: 'center' },
  anonRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1E293B', marginHorizontal: 16, borderRadius: 14,
    padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155',
  },
  anonTitle: { fontSize: 15, fontWeight: '700', color: '#F1F5F9' },
  anonSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  fieldBox: { paddingHorizontal: 16, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '700', color: '#94A3B8', marginBottom: 10 },
  subLabel: { fontSize: 12, color: '#64748B', marginBottom: 6 },
  input: {
    backgroundColor: '#1E293B', borderRadius: 12, padding: 14,
    color: '#F1F5F9', fontSize: 15, borderWidth: 1, borderColor: '#334155',
  },
  inputSmall: {
    backgroundColor: '#1E293B', borderRadius: 10, padding: 12,
    color: '#F1F5F9', fontSize: 14, borderWidth: 1, borderColor: '#334155',
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: '#475569', textAlign: 'right', marginTop: 4 },
  hint: { fontSize: 12, color: '#475569', marginTop: 6 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catCard: {
    backgroundColor: '#1E293B', borderRadius: 12, paddingHorizontal: 12,
    paddingVertical: 8, borderWidth: 1, borderColor: '#334155',
  },
  catLabel: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },
  locationBtn: {
    backgroundColor: '#1E293B', borderRadius: 12, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#334155', marginBottom: 10,
  },
  locationBtnActive: { borderColor: '#10B981', backgroundColor: '#10B98110' },
  locationBtnText: { fontSize: 15, color: '#FF6B35', fontWeight: '600' },
  locationInfo: { marginBottom: 10 },
  locationCoords: { fontSize: 12, color: '#64748B', textAlign: 'center' },
  locationFields: { flexDirection: 'row', gap: 10, marginTop: 8 },
  locationFieldHalf: { flex: 1 },
  submitBtn: {
    backgroundColor: '#FF6B35', margin: 16, borderRadius: 20,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: '#FF6B35', shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 17, color: '#fff', fontWeight: '700' },
});
