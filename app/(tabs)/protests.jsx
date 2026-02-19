import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, TextInput, RefreshControl, ActivityIndicator
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { playTap } from '../../lib/sounds';

export default function ProtestsScreen() {
  const router = useRouter();
  const [protests, setProtests] = useState([]);
  const [filteredProtests, setFilteredProtests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);
  const [fee, setFee] = useState(100000);

  useEffect(() => { init(); }, []);
  useEffect(() => { filterProtests(); }, [protests, activeTab, searchQuery]);

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      setCurrentUser(user);
    }
    const { data: settings } = await supabase
      .from('app_settings')
      .select('protest_creation_fee')
      .single();
    if (settings) setFee(settings.protest_creation_fee);
    await loadProtests();
  };

  const loadProtests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('protest_groups')
      .select('*')
      .eq('is_active', true)
      .order('member_count', { ascending: false })
      .limit(100);
    setProtests(data || []);
    setLoading(false);
  };

  const filterProtests = async () => {
    let filtered = [...protests];
    if (searchQuery.trim()) {
      filtered = filtered.filter(p =>
        p.title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (activeTab === 'mine' && currentUser) {
      filtered = filtered.filter(p => p.created_by === currentUser.id);
    } else if (activeTab === 'joined' && currentUser) {
      const { data: members } = await supabase
        .from('protest_members')
        .select('protest_id')
        .eq('user_id', currentUser.id);
      const ids = members?.map(m => m.protest_id) || [];
      filtered = filtered.filter(p => ids.includes(p.id));
    }
    setFilteredProtests(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProtests();
    setRefreshing(false);
  };

  const handleCreateProtest = async () => {
    await playTap();
    router.push('/protest/create');
  };

  const PROTEST_EMOJIS = {
    corruption: '💰', roads: '🛣️', water: '💧', electricity: '⚡',
    women_safety: '🛡️', health: '🏥', education: '📚', crime: '🚨',
    political: '🏛️', general: '✊', other: '✊',
  };

  const renderProtest = ({ item }) => (
    <TouchableOpacity
      style={styles.protestCard}
      onPress={async () => {
        await playTap();
        router.push(`/protest/${item.id}`);
      }}
      activeOpacity={0.85}
    >
      <View style={styles.protestHeader}>
        <View style={styles.protestTypeRow}>
          <Text style={styles.protestEmoji}>
            {PROTEST_EMOJIS[item.category] || '✊'}
          </Text>
          {item.is_admin_created && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>⚡ Official</Text>
            </View>
          )}
          {item.payment_verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>✅ Verified</Text>
            </View>
          )}
        </View>
        <View style={[styles.statusDot, {
          backgroundColor: item.is_active ? '#10B981' : '#EF4444'
        }]} />
      </View>

      <Text style={styles.protestTitle} numberOfLines={2}>{item.title}</Text>

      {item.description ? (
        <Text style={styles.protestDesc} numberOfLines={2}>{item.description}</Text>
      ) : null}

      <View style={styles.protestLocation}>
        <Text style={styles.locationText}>
          📍 {[item.district, item.state].filter(Boolean).join(', ') || 'India'}
        </Text>
      </View>

      <View style={styles.protestFooter}>
        <View style={styles.memberCount}>
          <Text style={styles.memberCountText}>👥 {item.member_count || 0} members</Text>
        </View>
        <View style={styles.protestMeta}>
          {item.is_public_join ? (
            <Text style={styles.joinTag}>🔓 Open</Text>
          ) : (
            <Text style={styles.privateTag}>🔒 Private</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.joinBtn}
          onPress={async () => {
            await playTap();
            router.push(`/protest/${item.id}`);
          }}
        >
          <Text style={styles.joinBtnText}>Dekho →</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>✊ Andolan</Text>
          <Text style={styles.headerSub}>{filteredProtests.length} protest groups</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={handleCreateProtest}>
          <Text style={styles.createBtnText}>+ Banao</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.feeBanner}>
        <Text style={styles.feeBannerText}>
          💰 Protest group banane ki fee: ₹{(fee / 100).toLocaleString()}
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Protest dhundho..."
          placeholderTextColor="#475569"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.tabsRow}>
        {[
          { key: 'all', label: '🌐 Sab' },
          { key: 'mine', label: '👤 Mere' },
          { key: 'joined', label: '✅ Joined' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={async () => { await playTap(); setActiveTab(tab.key); }}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : (
        <FlatList
          data={filteredProtests}
          keyExtractor={item => item.id}
          renderItem={renderProtest}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FF6B35"
            />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>✊</Text>
              <Text style={styles.emptyText}>Koi protest nahi hai abhi</Text>
              <Text style={styles.emptySubText}>Pehle wale bano!</Text>
              <TouchableOpacity style={styles.emptyCreateBtn} onPress={handleCreateProtest}>
                <Text style={styles.emptyCreateBtnText}>+ Protest Group Banao</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#F1F5F9' },
  headerSub: { fontSize: 12, color: '#64748B' },
  createBtn: {
    backgroundColor: '#FF6B35', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20,
  },
  createBtnText: { fontSize: 14, color: '#fff', fontWeight: '700' },
  feeBanner: {
    backgroundColor: '#FF6B3510', paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#FF6B3520',
  },
  feeBannerText: { fontSize: 12, color: '#FF6B35', textAlign: 'center' },
  searchContainer: { padding: 16, paddingBottom: 8 },
  searchInput: {
    backgroundColor: '#1E293B', borderRadius: 16, paddingHorizontal: 16,
    paddingVertical: 12, color: '#F1F5F9', fontSize: 14,
    borderWidth: 1, borderColor: '#334155',
  },
  tabsRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 8,
  },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 12,
    backgroundColor: '#1E293B', alignItems: 'center',
    borderWidth: 1, borderColor: '#334155',
  },
  tabActive: { backgroundColor: '#FF6B3520', borderColor: '#FF6B35' },
  tabText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  tabTextActive: { color: '#FF6B35', fontWeight: '700' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingTop: 4, paddingBottom: 20 },
  protestCard: {
    backgroundColor: '#1E293B', borderRadius: 16, marginBottom: 12,
    padding: 16, borderWidth: 1, borderColor: '#334155',
  },
  protestHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  protestTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  protestEmoji: { fontSize: 24 },
  adminBadge: {
    backgroundColor: '#FF6B3520', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1, borderColor: '#FF6B3540',
  },
  adminBadgeText: { fontSize: 10, color: '#FF6B35', fontWeight: '700' },
  verifiedBadge: {
    backgroundColor: '#10B98120', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8,
  },
  verifiedBadgeText: { fontSize: 10, color: '#10B981', fontWeight: '700' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  protestTitle: { fontSize: 17, fontWeight: '800', color: '#F1F5F9', marginBottom: 6 },
  protestDesc: { fontSize: 13, color: '#94A3B8', lineHeight: 20, marginBottom: 8 },
  protestLocation: { marginBottom: 10 },
  locationText: { fontSize: 12, color: '#64748B' },
  protestFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  memberCount: {
    backgroundColor: '#0F172A', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10,
  },
  memberCountText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  protestMeta: {},
  joinTag: { fontSize: 12, color: '#10B981', fontWeight: '600' },
  privateTag: { fontSize: 12, color: '#F59E0B', fontWeight: '600' },
  joinBtn: {
    backgroundColor: '#FF6B35', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 16,
  },
  joinBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#64748B' },
  emptySubText: { fontSize: 14, color: '#475569', marginTop: 8, marginBottom: 20 },
  emptyCreateBtn: {
    backgroundColor: '#FF6B35', paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 24,
  },
  emptyCreateBtnText: { fontSize: 15, color: '#fff', fontWeight: '700' },
});
