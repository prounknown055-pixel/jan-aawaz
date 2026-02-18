import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { playTap } from '../../lib/sounds';

export default function AreaProblems() {
  const router = useRouter();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeState, setActiveState] = useState('');
  const [activeDistrict, setActiveDistrict] = useState('');

  useEffect(() => { loadProblems(); }, [activeState, activeDistrict]);

  const loadProblems = async () => {
    let query = supabase
      .from('problems')
      .select(`
        *,
        users!problems_user_id_fkey(id, username, avatar_url, role)
      `)
      .eq('is_removed', false)
      .order('upvote_count', { ascending: false })
      .limit(100);

    if (activeState) query = query.eq('state', activeState);
    if (activeDistrict) query = query.eq('district', activeDistrict);

    const { data } = await query;
    setProblems(data || []);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProblems();
    setRefreshing(false);
  };

  const filtered = problems.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.title?.toLowerCase().includes(q) ||
      p.district?.toLowerCase().includes(q) ||
      p.state?.toLowerCase().includes(q) ||
      p.village?.toLowerCase().includes(q);
  });

  const getTimeAgo = (d) => {
    const diff = Date.now() - new Date(d).getTime();
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d`;
    const hrs = Math.floor(diff / 3600000);
    if (hrs > 0) return `${hrs}h`;
    return 'Abhi';
  };

  const CATEGORY_COLORS = {
    roads: '#F59E0B', water: '#3B82F6', electricity: '#EAB308',
    corruption: '#EF4444', women_safety: '#EC4899', health: '#10B981',
    education: '#8B5CF6', crime: '#F97316', political: '#6366F1',
    general: '#94A3B8', other: '#94A3B8',
  };

  const renderProblem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={async () => { await playTap(); router.push(`/problem/${item.id}`); }}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.catBadge, {
          backgroundColor: (CATEGORY_COLORS[item.category] || '#94A3B8') + '25'
        }]}>
          <Text style={[styles.catText, { color: CATEGORY_COLORS[item.category] || '#94A3B8' }]}>
            {item.category}
          </Text>
        </View>
        {item.is_trending && (
          <Text style={styles.trendingTag}>🔥 Trending</Text>
        )}
        {item.is_anonymous && (
          <Text style={styles.anonTag}>🎭 Anon</Text>
        )}
      </View>

      <Text style={styles.cardTitle}>{item.title}</Text>
      {item.description && (
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.locationText}>
          📍 {[item.village, item.block, item.district, item.state].filter(Boolean).join(', ')}
        </Text>
        <View style={styles.cardStats}>
          <Text style={styles.upvoteText}>👍 {item.upvote_count || 0}</Text>
          <Text style={styles.timeText}>{getTimeAgo(item.created_at)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={async () => { await playTap(); router.back(); }}>
          <Text style={styles.backBtn}>← Wapas</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📍 Area Problems</Text>
        <Text style={styles.countText}>{filtered.length}</Text>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="🔍 Area ya problem dhundho..."
        placeholderTextColor="#475569"
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.filterRow}>
        <TextInput
          style={styles.filterInput}
          placeholder="State filter..."
          placeholderTextColor="#475569"
          value={activeState}
          onChangeText={setActiveState}
        />
        <TextInput
          style={styles.filterInput}
          placeholder="District filter..."
          placeholderTextColor="#475569"
          value={activeDistrict}
          onChangeText={setActiveDistrict}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderProblem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📍</Text>
              <Text style={styles.emptyText}>Is area mein koi problem nahi</Text>
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
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#F1F5F9' },
  countText: { fontSize: 14, color: '#64748B' },
  searchInput: {
    backgroundColor: '#1E293B', margin: 16, marginBottom: 8, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12, color: '#F1F5F9',
    fontSize: 14, borderWidth: 1, borderColor: '#334155',
  },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  filterInput: {
    flex: 1, backgroundColor: '#1E293B', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, color: '#F1F5F9',
    fontSize: 13, borderWidth: 1, borderColor: '#334155',
  },
  list: { padding: 16, paddingTop: 8, paddingBottom: 20 },
  card: {
    backgroundColor: '#1E293B', borderRadius: 16, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#334155',
  },
  cardHeader: { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  catBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  catText: { fontSize: 11, fontWeight: '700' },
  trendingTag: { fontSize: 11, color: '#FF6B35', fontWeight: '700' },
  anonTag: { fontSize: 11, color: '#A78BFA', fontWeight: '700' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#F1F5F9', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#94A3B8', lineHeight: 18, marginBottom: 8 },
  cardFooter: {},
  locationText: { fontSize: 12, color: '#64748B', marginBottom: 6 },
  cardStats: { flexDirection: 'row', justifyContent: 'space-between' },
  upvoteText: { fontSize: 13, color: '#10B981', fontWeight: '600' },
  timeText: { fontSize: 11, color: '#475569' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#64748B' },
});
