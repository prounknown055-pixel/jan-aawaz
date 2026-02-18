import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, RefreshControl, ScrollView
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { playTap } from '../../lib/sounds';

export default function AdminAds() {
  const router = useRouter();
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [adType, setAdType] = useState('banner');
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadAds(); }, []);

  const loadAds = async () => {
    const { data } = await supabase
      .from('ads')
      .select('*')
      .order('created_at', { ascending: false });
    setAds(data || []);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAds();
    setRefreshing(false);
  };

  const handleCreate = async () => {
    await playTap();
    if (!title.trim()) { Alert.alert('Error', 'Ad title likhna zaroori hai.'); return; }
    setCreating(true);
    await supabase.from('ads').insert({
      title: title.trim(),
      image_url: imageUrl.trim() || null,
      redirect_url: redirectUrl.trim() || null,
      ad_type: adType,
      is_active: true,
    });
    setTitle(''); setImageUrl(''); setRedirectUrl(''); setAdType('banner');
    setShowCreate(false);
    await loadAds();
    Alert.alert('✅ Ad Create Ho Gayi!');
    setCreating(false);
  };

  const handleToggle = async (ad) => {
    await playTap();
    await supabase.from('ads').update({ is_active: !ad.is_active }).eq('id', ad.id);
    await loadAds();
  };

  const handleDelete = async (adId) => {
    await playTap();
    Alert.alert('Delete Karo?', 'Ad delete karna chahte ho?', [
      { text: 'Nahi', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('ads').delete().eq('id', adId);
          await loadAds();
        },
      },
    ]);
  };

  const renderAd = ({ item }) => (
    <View style={styles.adCard}>
      <View style={styles.adHeader}>
        <View>
          <Text style={styles.adTitle}>{item.title}</Text>
          <View style={styles.adMeta}>
            <View style={[styles.typeBadge, {
              backgroundColor: item.ad_type === 'popup' ? '#8B5CF620' : '#3B82F620'
            }]}>
              <Text style={[styles.typeBadgeText, {
                color: item.ad_type === 'popup' ? '#8B5CF6' : '#3B82F6'
              }]}>{item.ad_type}</Text>
            </View>
            <Text style={styles.adStats}>👁️ {item.impression_count || 0} | 👆 {item.click_count || 0}</Text>
          </View>
        </View>
        <View style={[styles.statusDot, { backgroundColor: item.is_active ? '#10B981' : '#EF4444' }]} />
      </View>

      <View style={styles.adActions}>
        <TouchableOpacity
          style={[styles.toggleBtn, item.is_active ? styles.offBtn : styles.onBtn]}
          onPress={() => handleToggle(item)}
        >
          <Text style={styles.toggleBtnText}>{item.is_active ? '⏸️ Off Karo' : '▶️ On Karo'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
          <Text style={styles.deleteBtnText}>🗑️ Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={async () => { await playTap(); router.back(); }}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📢 Ads</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={async () => { await playTap(); setShowCreate(!showCreate); }}
        >
          <Text style={styles.createBtnText}>{showCreate ? '✕ Band' : '+ Create'}</Text>
        </TouchableOpacity>
      </View>

      {showCreate && (
        <ScrollView style={styles.createForm} keyboardShouldPersistTaps="handled">
          <Text style={styles.createTitle}>Naya Ad Banao</Text>
          <TextInput style={styles.input} placeholder="Ad Title *" placeholderTextColor="#475569" value={title} onChangeText={setTitle} />
          <TextInput style={styles.input} placeholder="Image URL (optional)" placeholderTextColor="#475569" value={imageUrl} onChangeText={setImageUrl} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Redirect URL (optional)" placeholderTextColor="#475569" value={redirectUrl} onChangeText={setRedirectUrl} autoCapitalize="none" />

          <View style={styles.typeRow}>
            {['banner', 'popup', 'interstitial'].map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.typeBtn, adType === t && styles.typeBtnActive]}
                onPress={async () => { await playTap(); setAdType(t); }}
              >
                <Text style={[styles.typeBtnText, adType === t && styles.typeBtnTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={creating}>
            {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>✅ Ad Banao</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : (
        <FlatList
          data={ads}
          keyExtractor={item => item.id}
          renderItem={renderAd}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📢</Text>
              <Text style={styles.emptyText}>Koi ad nahi hai abhi</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  backBtn: { fontSize: 14, color: '#FF6B35', fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#F1F5F9' },
  createBtn: { backgroundColor: '#FF6B35', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  createBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  createForm: {
    backgroundColor: '#1E293B', padding: 16, borderBottomWidth: 1, borderBottomColor: '#334155',
    maxHeight: 400,
  },
  createTitle: { fontSize: 16, fontWeight: '800', color: '#F1F5F9', marginBottom: 12 },
  input: {
    backgroundColor: '#0F172A', borderRadius: 10, padding: 12, color: '#F1F5F9',
    fontSize: 14, borderWidth: 1, borderColor: '#334155', marginBottom: 10,
  },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeBtn: {
    flex: 1, backgroundColor: '#0F172A', borderRadius: 10, paddingVertical: 8,
    alignItems: 'center', borderWidth: 1, borderColor: '#334155',
  },
  typeBtnActive: { backgroundColor: '#FF6B3520', borderColor: '#FF6B35' },
  typeBtnText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  typeBtnTextActive: { color: '#FF6B35' },
  submitBtn: {
    backgroundColor: '#FF6B35', borderRadius: 12, paddingVertical: 12,
    alignItems: 'center', marginBottom: 16,
  },
  submitBtnText: { fontSize: 14, color: '#fff', fontWeight: '700' },
  list: { padding: 16 },
  adCard: {
    backgroundColor: '#1E293B', borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#334155',
  },
  adHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  adTitle: { fontSize: 15, fontWeight: '700', color: '#F1F5F9', marginBottom: 6 },
  adMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  adStats: { fontSize: 11, color: '#64748B' },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  adActions: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  onBtn: { backgroundColor: '#10B98120', borderWidth: 1, borderColor: '#10B981' },
  offBtn: { backgroundColor: '#F59E0B20', borderWidth: 1, borderColor: '#F59E0B' },
  toggleBtnText: { fontSize: 12, color: '#F1F5F9', fontWeight: '600' },
  deleteBtn: {
    backgroundColor: '#EF444420', borderWidth: 1, borderColor: '#EF4444',
    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center',
  },
  deleteBtnText: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#64748B' },
});
