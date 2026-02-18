import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ScrollView, Animated, Image, Alert
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getProblems, getAppSettings } from '../../lib/supabase';
import { playTap } from '../../lib/sounds';

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [problems, setProblems] = useState([]);
  const [trending, setTrending] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [adVisible, setAdVisible] = useState(false);
  const [currentAd, setCurrentAd] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const categories = [
    { key: 'all', label: '🌐 Sab', color: '#FF6B35' },
    { key: 'roads', label: '🛣️ Sadak', color: '#F59E0B' },
    { key: 'water', label: '💧 Paani', color: '#3B82F6' },
    { key: 'electricity', label: '⚡ Bijli', color: '#EAB308' },
    { key: 'corruption', label: '💰 Bhrashtachar', color: '#EF4444' },
    { key: 'women_safety', label: '🛡️ Mahila Suraksha', color: '#EC4899' },
    { key: 'health', label: '🏥 Swasthya', color: '#10B981' },
    { key: 'education', label: '📚 Shiksha', color: '#8B5CF6' },
    { key: 'crime', label: '🚨 Apradh', color: '#F97316' },
    { key: 'political', label: '🏛️ Rajneeti', color: '#6366F1' },
    { key: 'other', label: '📌 Anya', color: '#94A3B8' },
  ];

  useEffect(() => {
    loadData();
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    loadProblems();
  }, [activeCategory]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadUser(), loadProblems(), loadTrending(), loadLeaders(), loadSettings(), checkAds()]);
    setLoading(false);
  };

  const loadUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data } = await supabase.from('users').select('*').eq('id', authUser.id).single();
      setUser(data);
    }
  };

  const loadProblems = async () => {
    const filter = activeCategory === 'all' ? {} : { category: activeCategory };
    const { data } = await getProblems(filter);
    setProblems(data || []);
  };

  const loadTrending = async () => {
    const { data } = await supabase
      .from('trending_topics')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5);
    setTrending(data || []);
  };

  const loadLeaders = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, name, username, avatar_url, leader_type, leader_area, leader_badge_color, popularity_score, follower_count')
      .eq('role', 'leader')
      .eq('leader_verified', true)
      .order('popularity_score', { ascending: false })
      .limit(5);
    setLeaders(data || []);
  };

  const loadSettings = async () => {
    const { data } = await getAppSettings();
    setSettings(data);
  };

  const checkAds = async () => {
    const { data } = await supabase
      .from('ads')
      .select('*')
      .eq('is_active', true)
      .eq('ad_type', 'popup')
      .single();
    if (data) {
      setCurrentAd(data);
      setTimeout(() => setAdVisible(true), 3000);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleProblemPress = async (problem) => {
    await playTap();
    router.push(`/problem/${problem.id}`);
  };

  const handleLeaderPress = async (leader) => {
    await playTap();
    router.push(`/leader/${leader.id}`);
  };

  const renderProblemCard = ({ item }) => (
    <TouchableOpacity
      style={styles.problemCard}
      onPress={() => handleProblemPress(item)}
      activeOpacity={0.85}
    >
      <View style={styles.problemHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) + '30' }]}>
          <Text style={[styles.categoryText, { color: getCategoryColor(item.category) }]}>
            {getCategoryLabel(item.category)}
          </Text>
        </View>
        {item.is_trending && (
          <View style={styles.trendingBadge}>
            <Text style={styles.trendingText}>🔥 Trending</Text>
          </View>
        )}
        {item.is_anonymous && (
          <View style={styles.anonBadge}>
            <Text style={styles.anonText}>🎭 Anonymous</Text>
          </View>
        )}
      </View>

      <Text style={styles.problemTitle}>{item.title}</Text>
      {item.description && (
        <Text style={styles.problemDesc} numberOfLines={2}>{item.description}</Text>
      )}
      {item.ai_summary && (
        <View style={styles.aiSummaryBox}>
          <Text style={styles.aiLabel}>🤖 AI Summary</Text>
          <Text style={styles.aiSummaryText}>{item.ai_summary}</Text>
        </View>
      )}

      <View style={styles.problemFooter}>
        <View style={styles.locationRow}>
          <Text style={styles.locationText}>
            📍 {[item.village, item.block, item.district, item.state].filter(Boolean).join(', ')}
          </Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.upvoteCount}>👍 {item.upvote_count || 0}</Text>
          <Text style={styles.timeText}>{getTimeAgo(item.created_at)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const getCategoryColor = (cat) => {
    const found = categories.find(c => c.key === cat);
    return found?.color || '#94A3B8';
  };

  const getCategoryLabel = (cat) => {
    const found = categories.find(c => c.key === cat);
    return found?.label || cat;
  };

  const getTimeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (days > 0) return `${days} din pehle`;
    if (hrs > 0) return `${hrs} ghante pehle`;
    if (mins > 0) return `${mins} min pehle`;
    return 'Abhi';
  };

  return (
    <View style={styles.container}>
      {/* Popup Ad */}
      {adVisible && currentAd && (
        <View style={styles.adOverlay}>
          <View style={styles.adModal}>
            <TouchableOpacity style={styles.adClose} onPress={async () => { await playTap(); setAdVisible(false); }}>
              <Text style={styles.adCloseText}>✕</Text>
            </TouchableOpacity>
            {currentAd.image_url && (
              <Image source={{ uri: currentAd.image_url }} style={styles.adImage} />
            )}
            <Text style={styles.adTitle}>{currentAd.title}</Text>
          </View>
        </View>
      )}

      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
        <FlatList
          data={problems}
          keyExtractor={item => item.id}
          renderItem={renderProblemCard}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
          ListHeaderComponent={
            <View>
              {/* Header */}
              <View style={styles.header}>
                <View>
                  <Text style={styles.greeting}>
                    Jai Hind 🇮🇳
                  </Text>
                  <Text style={styles.headerTitle}>जन आवाज़</Text>
                  <Text style={styles.headerSub}>Awaaz Uthao, Badlaav Lao</Text>
                </View>
                <View style={styles.headerRight}>
                  {user?.role === 'admin' && (
                    <TouchableOpacity
                      style={styles.adminBtn}
                      onPress={async () => { await playTap(); router.push('/admin/dashboard'); }}
                    >
                      <Text style={styles.adminBtnText}>⚙️</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.notifBtn}
                    onPress={async () => { await playTap(); }}
                  >
                    <Text style={styles.notifText}>🔔</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Add Problem Button */}
              {settings?.map_enabled !== false && (
                <TouchableOpacity
                  style={styles.addProblemBtn}
                  onPress={async () => { await playTap(); router.push('/problem/add'); }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.addProblemIcon}>📢</Text>
                  <View style={styles.addProblemText}>
                    <Text style={styles.addProblemTitle}>Apni Problem Batao</Text>
                    <Text style={styles.addProblemSub}>Map par anonymously post karo</Text>
                  </View>
                  <Text style={styles.addProblemArrow}>→</Text>
                </TouchableOpacity>
              )}

              {/* Trending */}
              {trending.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>🔥 Trending Topics</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {trending.map(t => (
                      <TouchableOpacity
                        key={t.id}
                        style={styles.trendingCard}
                        onPress={() => playTap()}
                        activeOpacity={0.85}
                      >
                        {t.image_url && <Image source={{ uri: t.image_url }} style={styles.trendingImg} />}
                        <Text style={styles.trendingTitle} numberOfLines={2}>{t.title}</Text>
                        {t.is_ai_generated && <Text style={styles.trendingAi}>🤖 AI</Text>}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Leaders */}
              {leaders.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>👑 Leaders</Text>
                    <TouchableOpacity onPress={async () => { await playTap(); }}>
                      <Text style={styles.seeAll}>Sab dekho →</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {leaders.map(l => (
                      <TouchableOpacity
                        key={l.id}
                        style={styles.leaderCard}
                        onPress={() => handleLeaderPress(l)}
                        activeOpacity={0.85}
                      >
                        <View style={[styles.leaderAvatar, { borderColor: l.leader_badge_color || '#6B7280' }]}>
                          <Text style={styles.leaderAvatarText}>
                            {l.name?.[0]?.toUpperCase() || '?'}
                          </Text>
                        </View>
                        <View style={[styles.leaderBadge, { backgroundColor: l.leader_badge_color || '#6B7280' }]}>
                          <Text style={styles.leaderBadgeText}>{l.leader_type || 'Leader'}</Text>
                        </View>
                        <Text style={styles.leaderName} numberOfLines={1}>{l.name}</Text>
                        <Text style={styles.leaderArea} numberOfLines={1}>{l.leader_area}</Text>
                        <Text style={styles.leaderStats}>⭐ {l.popularity_score || 0}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Ad Banner */}
              <AdBannerInline />

              {/* Categories */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📂 Categories</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {categories.map(cat => (
                    <TouchableOpacity
                      key={cat.key}
                      style={[
                        styles.catChip,
                        activeCategory === cat.key && { backgroundColor: cat.color + '30', borderColor: cat.color }
                      ]}
                      onPress={async () => { await playTap(); setActiveCategory(cat.key); }}
                      activeOpacity={0.85}
                    >
                      <Text style={[
                        styles.catChipText,
                        activeCategory === cat.key && { color: cat.color, fontWeight: '700' }
                      ]}>{cat.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.sectionTitle}>📋 Naye Problems</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🌟</Text>
              <Text style={styles.emptyText}>Abhi koi problem nahi hai</Text>
              <Text style={styles.emptySubText}>Pehle wale bano! Apni problem batao.</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </Animated.View>
    </View>
  );
}

const AdBannerInline = () => {
  const [ad, setAd] = useState(null);

  useEffect(() => {
    supabase.from('ads').select('*').eq('is_active', true).eq('ad_type', 'banner').single()
      .then(({ data }) => setAd(data));
  }, []);

  if (!ad) return null;

  return (
    <TouchableOpacity style={styles.adBanner} activeOpacity={0.9}>
      {ad.image_url ? (
        <Image source={{ uri: ad.image_url }} style={styles.adBannerImg} />
      ) : (
        <View style={styles.adBannerPlaceholder}>
          <Text style={styles.adBannerText}>📢 {ad.title}</Text>
        </View>
      )}
      <Text style={styles.adLabel}>Ad</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  inner: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#1E293B',
  },
  greeting: { fontSize: 13, color: '#64748B' },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#FF6B35' },
  headerSub: { fontSize: 12, color: '#475569', fontStyle: 'italic' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8 },
  adminBtn: {
    backgroundColor: '#FF6B3520', borderRadius: 20,
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
  },
  adminBtnText: { fontSize: 18 },
  notifBtn: {
    backgroundColor: '#1E293B', borderRadius: 20,
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#334155',
  },
  notifText: { fontSize: 18 },
  addProblemBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FF6B3515', borderWidth: 1, borderColor: '#FF6B3540',
    margin: 16, borderRadius: 16, padding: 16,
  },
  addProblemIcon: { fontSize: 32, marginRight: 12 },
  addProblemText: { flex: 1 },
  addProblemTitle: { fontSize: 16, fontWeight: '700', color: '#FF6B35' },
  addProblemSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  addProblemArrow: { fontSize: 20, color: '#FF6B35' },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#F1F5F9', paddingHorizontal: 16, marginBottom: 12, marginTop: 8 },
  seeAll: { fontSize: 13, color: '#FF6B35' },
  trendingCard: {
    backgroundColor: '#1E293B', borderRadius: 14,
    marginRight: 12, width: 160, padding: 12,
    borderWidth: 1, borderColor: '#334155',
  },
  trendingImg: { width: '100%', height: 80, borderRadius: 8, marginBottom: 8 },
  trendingTitle: { fontSize: 13, color: '#E2E8F0', fontWeight: '600' },
  trendingAi: { fontSize: 11, color: '#60A5FA', marginTop: 4 },
  leaderCard: {
    backgroundColor: '#1E293B', borderRadius: 16,
    marginRight: 12, width: 110, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#334155',
  },
  leaderAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, marginBottom: 6,
  },
  leaderAvatarText: { fontSize: 22, fontWeight: '700', color: '#F1F5F9' },
  leaderBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginBottom: 4,
  },
  leaderBadgeText: { fontSize: 9, color: '#fff', fontWeight: '700' },
  leaderName: { fontSize: 12, fontWeight: '700', color: '#F1F5F9', textAlign: 'center' },
  leaderArea: { fontSize: 10, color: '#64748B', textAlign: 'center', marginTop: 2 },
  leaderStats: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', marginRight: 8,
  },
  catChipText: { fontSize: 13, color: '#94A3B8' },
  problemCard: {
    backgroundColor: '#1E293B', borderRadius: 16, marginHorizontal: 16,
    marginBottom: 12, padding: 16, borderWidth: 1, borderColor: '#334155',
  },
  problemHeader: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  categoryText: { fontSize: 11, fontWeight: '700' },
  trendingBadge: { backgroundColor: '#FF6B3520', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  trendingText: { fontSize: 11, color: '#FF6B35', fontWeight: '700' },
  anonBadge: { backgroundColor: '#7C3AED20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  anonText: { fontSize: 11, color: '#A78BFA', fontWeight: '700' },
  problemTitle: { fontSize: 16, fontWeight: '700', color: '#F1F5F9', marginBottom: 6 },
  problemDesc: { fontSize: 13, color: '#94A3B8', lineHeight: 20, marginBottom: 8 },
  aiSummaryBox: {
    backgroundColor: '#0F172A', borderRadius: 10, padding: 10, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: '#60A5FA',
  },
  aiLabel: { fontSize: 10, color: '#60A5FA', fontWeight: '700', marginBottom: 4 },
  aiSummaryText: { fontSize: 12, color: '#93C5FD' },
  problemFooter: {},
  locationRow: { marginBottom: 6 },
  locationText: { fontSize: 12, color: '#64748B' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  upvoteCount: { fontSize: 13, color: '#10B981', fontWeight: '600' },
  timeText: { fontSize: 11, color: '#475569' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#64748B' },
  emptySubText: { fontSize: 14, color: '#475569', marginTop: 8 },
  adOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#00000080', zIndex: 100, alignItems: 'center', justifyContent: 'center',
  },
  adModal: {
    backgroundColor: '#1E293B', borderRadius: 20, padding: 20, margin: 32,
    width: '85%', alignItems: 'center',
  },
  adClose: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: '#334155', width: 28, height: 28,
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
  adCloseText: { color: '#F1F5F9', fontWeight: '700' },
  adImage: { width: '100%', height: 180, borderRadius: 12, marginBottom: 12 },
  adTitle: { fontSize: 16, fontWeight: '700', color: '#F1F5F9', textAlign: 'center' },
  adBanner: {
    marginHorizontal: 16, marginBottom: 16, borderRadius: 12, overflow: 'hidden',
    position: 'relative',
  },
  adBannerImg: { width: '100%', height: 80 },
  adBannerPlaceholder: {
    backgroundColor: '#1E293B', height: 60, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#334155', borderRadius: 12,
  },
  adBannerText: { color: '#94A3B8', fontSize: 14 },
  adLabel: {
    position: 'absolute', top: 4, right: 8,
    backgroundColor: '#33415580', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, fontSize: 10, color: '#94A3B8',
  },
});
