import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, Animated
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { followUser, castAnnualVote, getLeaderVoteStats } from '../../lib/supabase';
import { analyzeLeaderPerformance } from '../../lib/ai';
import { playTap } from '../../lib/sounds';

export default function LeaderProfile() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [leader, setLeader] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [problems, setProblems] = useState([]);
  const [voteStats, setVoteStats] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [voteLoading, setVoteLoading] = useState(false);
  const [settings, setSettings] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadAll();
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [id]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadLeader(), loadCurrentUser(), loadProblems(), loadVoteStats(), loadSettings()]);
    setLoading(false);
  };

  const loadLeader = async () => {
    const { data } = await supabase.from('users').select('*').eq('id', id).single();
    setLeader(data);
  };

  const loadCurrentUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data } = await supabase.from('users').select('*').eq('id', authUser.id).single();
      setCurrentUser(data);
      const { data: follow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', authUser.id)
        .eq('following_id', id)
        .single();
      setIsFollowing(!!follow);
    }
  };

  const loadProblems = async () => {
    const { data } = await supabase
      .from('problems')
      .select('id, title, category, upvote_count, created_at, district, state')
      .eq('is_removed', false)
      .order('upvote_count', { ascending: false })
      .limit(5);
    setProblems(data || []);
  };

  const loadVoteStats = async () => {
    const { data } = await getLeaderVoteStats(id);
    setVoteStats(data);
  };

  const loadSettings = async () => {
    const { data } = await supabase.from('app_settings').select('voting_open').single();
    setSettings(data);
  };

  const handleFollow = async () => {
    await playTap();
    if (!currentUser) { Alert.alert('Login Karo', 'Follow karne ke liye login karo.'); return; }
    const { data } = await followUser(currentUser.id, id);
    setIsFollowing(data?.action === 'followed');
    await loadLeader();
  };

  const handleVote = async (voteType) => {
    await playTap();
    if (!settings?.voting_open) {
      Alert.alert('Voting Band Hai', 'Abhi voting ka samay nahi hai. Jan 1 ko vote kar sakte ho.');
      return;
    }
    if (!currentUser) { Alert.alert('Login Karo', 'Vote karne ke liye login karo.'); return; }
    if (currentUser.id === id) { Alert.alert('Error', 'Khud ko vote nahi kar sakte.'); return; }
    setVoteLoading(true);
    const { error } = await castAnnualVote(currentUser.id, id, voteType);
    if (error) {
      Alert.alert('Error', 'Vote nahi diya ja saka.');
    } else {
      Alert.alert('✅ Vote Diya!', `Aapne ${voteType === 'positive' ? '👍 Positive' : '👎 Negative'} vote diya.`);
      await loadVoteStats();
    }
    setVoteLoading(false);
  };

  const handleAiAnalysis = async () => {
    await playTap();
    setAnalysisLoading(true);
    const analysis = await analyzeLeaderPerformance(leader, problems, voteStats);
    setAiAnalysis(analysis);
    setAnalysisLoading(false);
  };

  const handleMessage = async () => {
    await playTap();
    Alert.alert(
      'Message Nahi Kar Sakte',
      'Leader ko direct message nahi kar sakte. World Chat mein apni baat rakho.',
      [
        { text: 'World Chat Kholo', onPress: () => router.push('/(tabs)/world-chat') },
        { text: 'Theek Hai', style: 'cancel' },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const getVotePercent = (type) => {
    if (!voteStats || voteStats.total === 0) return 0;
    return Math.round((voteStats[type] / voteStats.total) * 100);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (!leader) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.notFoundText}>Leader nahi mila</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Wapas Jao</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const positivePercent = getVotePercent('positive');
  const negativePercent = getVotePercent('negative');

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={async () => { await playTap(); router.back(); }}>
            <Text style={styles.backBtnText}>← Wapas</Text>
          </TouchableOpacity>
          {currentUser?.role === 'admin' && (
            <TouchableOpacity
              style={styles.editBtn}
              onPress={async () => { await playTap(); }}
            >
              <Text style={styles.editBtnText}>✏️ Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Profile Hero */}
        <View style={styles.heroSection}>
          <View style={[styles.avatarCircle, { borderColor: leader.leader_badge_color || '#FF6B35' }]}>
            <Text style={styles.avatarText}>{leader.name?.[0]?.toUpperCase() || '?'}</Text>
            {leader.leader_verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓</Text>
              </View>
            )}
          </View>

          <Text style={styles.leaderName}>{leader.name}</Text>
          <Text style={styles.leaderHandle}>@{leader.username}</Text>

          <View style={[styles.typeBadge, { backgroundColor: leader.leader_badge_color || '#6B7280' }]}>
            <Text style={styles.typeBadgeText}>{leader.leader_type || 'Leader'}</Text>
          </View>

          <Text style={styles.leaderArea}>
            📍 {[leader.leader_area, leader.leader_district, leader.leader_state].filter(Boolean).join(', ')}
          </Text>

          {leader.bio && <Text style={styles.leaderBio}>{leader.bio}</Text>}

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.followBtn, isFollowing && styles.followingBtn]}
              onPress={handleFollow}
            >
              <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                {isFollowing ? '✓ Following' : '+ Follow'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.msgBtn} onPress={handleMessage}>
              <Text style={styles.msgBtnText}>💬 Message</Text>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{leader.follower_count || 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: '#FF6B35' }]}>{leader.popularity_score || 0}</Text>
              <Text style={styles.statLabel}>Popularity</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: '#EF4444' }]}>{leader.total_cases_filed || 0}</Text>
              <Text style={styles.statLabel}>Cases</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: '#F59E0B' }]}>
                ₹{((leader.scam_wallet_amount || 0) / 100).toLocaleString('en-IN')}
              </Text>
              <Text style={styles.statLabel}>Scam 💰</Text>
            </View>
          </View>
        </View>

        {/* Voting Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🗳️ Public Rating</Text>
          <View style={styles.voteCard}>
            <View style={styles.voteBar}>
              <View style={[styles.voteBarPositive, { flex: positivePercent || 1 }]} />
              <View style={[styles.voteBarNegative, { flex: negativePercent || 1 }]} />
            </View>
            <View style={styles.voteLabels}>
              <Text style={styles.votePositiveLabel}>👍 {positivePercent}% ({voteStats?.positive || 0})</Text>
              <Text style={styles.voteTotalLabel}>Total: {voteStats?.total || 0}</Text>
              <Text style={styles.voteNegativeLabel}>👎 {negativePercent}% ({voteStats?.negative || 0})</Text>
            </View>
            {settings?.voting_open && (
              <View style={styles.voteBtns}>
                <TouchableOpacity
                  style={styles.votePositiveBtn}
                  onPress={() => handleVote('positive')}
                  disabled={voteLoading}
                >
                  <Text style={styles.voteBtnText}>👍 Achha Kaam</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.voteNegativeBtn}
                  onPress={() => handleVote('negative')}
                  disabled={voteLoading}
                >
                  <Text style={styles.voteBtnText}>👎 Bura Kaam</Text>
                </TouchableOpacity>
              </View>
            )}
            {!settings?.voting_open && (
              <Text style={styles.votingClosedText}>
                🔒 Voting abhi band hai. Jan 1 ko khulegi.
              </Text>
            )}
          </View>
        </View>

        {/* Pending Works */}
        {leader.pending_works?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⏳ Pending Kaam</Text>
            <View style={styles.worksCard}>
              {leader.pending_works.map((work, i) => (
                <View key={i} style={styles.workItem}>
                  <View style={styles.workDot} />
                  <Text style={styles.workText}>{work}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Completed Works */}
        {leader.completed_works?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✅ Completed Kaam</Text>
            <View style={[styles.worksCard, { borderLeftColor: '#10B981' }]}>
              {leader.completed_works.map((work, i) => (
                <View key={i} style={styles.workItem}>
                  <View style={[styles.workDot, { backgroundColor: '#10B981' }]} />
                  <Text style={styles.workText}>{work}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* AI Analysis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤖 AI Analysis</Text>
          {aiAnalysis ? (
            <View style={styles.aiCard}>
              <Text style={styles.aiCardText}>{aiAnalysis}</Text>
              <TouchableOpacity onPress={async () => { await playTap(); setAiAnalysis(''); }}>
                <Text style={styles.aiRefresh}>🔄 Dobara Karo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.aiBtn}
              onPress={handleAiAnalysis}
              disabled={analysisLoading}
            >
              {analysisLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.aiBtnText}>🤖 AI se Analysis Karo</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Area Problems */}
        {problems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Area Problems</Text>
            {problems.map(p => (
              <TouchableOpacity
                key={p.id}
                style={styles.problemItem}
                onPress={async () => { await playTap(); router.push(`/problem/${p.id}`); }}
              >
                <Text style={styles.problemTitle} numberOfLines={1}>{p.title}</Text>
                <View style={styles.problemMeta}>
                  <Text style={styles.problemUpvotes}>👍 {p.upvote_count || 0}</Text>
                  <Text style={styles.problemLocation}>{p.district}, {p.state}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  loadingContainer: { flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, color: '#64748B', marginBottom: 12 },
  backLink: { fontSize: 14, color: '#FF6B35' },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
  },
  backBtn: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#1E293B', borderRadius: 20 },
  backBtnText: { fontSize: 14, color: '#FF6B35', fontWeight: '600' },
  editBtn: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#1E293B', borderRadius: 20 },
  editBtnText: { fontSize: 14, color: '#94A3B8' },
  heroSection: {
    backgroundColor: '#1E293B', margin: 16, borderRadius: 20, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: '#334155',
  },
  avatarCircle: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: '#0F172A',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, marginBottom: 12, position: 'relative',
  },
  avatarText: { fontSize: 40, fontWeight: '900', color: '#F1F5F9' },
  verifiedBadge: {
    position: 'absolute', bottom: 2, right: 2,
    backgroundColor: '#10B981', width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#1E293B',
  },
  verifiedText: { fontSize: 12, color: '#fff', fontWeight: '900' },
  leaderName: { fontSize: 24, fontWeight: '900', color: '#F1F5F9', marginBottom: 4 },
  leaderHandle: { fontSize: 14, color: '#64748B', marginBottom: 10 },
  typeBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 8 },
  typeBadgeText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  leaderArea: { fontSize: 13, color: '#94A3B8', marginBottom: 8, textAlign: 'center' },
  leaderBio: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 12 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 16, marginTop: 4 },
  followBtn: {
    backgroundColor: '#FF6B35', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20,
  },
  followingBtn: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#FF6B35' },
  followBtnText: { fontSize: 14, color: '#fff', fontWeight: '700' },
  followingBtnText: { color: '#FF6B35' },
  msgBtn: {
    backgroundColor: '#1E293B', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: '#334155',
  },
  msgBtnText: { fontSize: 14, color: '#94A3B8', fontWeight: '600' },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    width: '100%', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#334155',
  },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 16, fontWeight: '900', color: '#F1F5F9' },
  statLabel: { fontSize: 10, color: '#64748B', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#334155' },
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#F1F5F9', marginBottom: 10 },
  voteCard: {
    backgroundColor: '#1E293B', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#334155',
  },
  voteBar: {
    flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 8,
  },
  voteBarPositive: { backgroundColor: '#10B981' },
  voteBarNegative: { backgroundColor: '#EF4444' },
  voteLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  votePositiveLabel: { fontSize: 12, color: '#10B981', fontWeight: '600' },
  voteTotalLabel: { fontSize: 12, color: '#64748B' },
  voteNegativeLabel: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
  voteBtns: { flexDirection: 'row', gap: 10 },
  votePositiveBtn: {
    flex: 1, backgroundColor: '#10B98120', borderWidth: 1, borderColor: '#10B981',
    borderRadius: 12, paddingVertical: 10, alignItems: 'center',
  },
  voteNegativeBtn: {
    flex: 1, backgroundColor: '#EF444420', borderWidth: 1, borderColor: '#EF4444',
    borderRadius: 12, paddingVertical: 10, alignItems: 'center',
  },
  voteBtnText: { fontSize: 13, color: '#F1F5F9', fontWeight: '700' },
  votingClosedText: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 8 },
  worksCard: {
    backgroundColor: '#1E293B', borderRadius: 14, padding: 14,
    borderLeftWidth: 4, borderLeftColor: '#F59E0B',
  },
  workItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  workDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B',
    marginRight: 10, marginTop: 5,
  },
  workText: { fontSize: 13, color: '#94A3B8', flex: 1, lineHeight: 20 },
  aiCard: {
    backgroundColor: '#1E293B', borderRadius: 16, padding: 16,
    borderLeftWidth: 4, borderLeftColor: '#6366F1',
  },
  aiCardText: { fontSize: 14, color: '#C7D2FE', lineHeight: 22 },
  aiRefresh: { fontSize: 12, color: '#6366F1', marginTop: 10, textAlign: 'right' },
  aiBtn: {
    backgroundColor: '#6366F1', borderRadius: 16, padding: 16, alignItems: 'center',
  },
  aiBtnText: { fontSize: 14, color: '#fff', fontWeight: '700' },
  problemItem: {
    backgroundColor: '#1E293B', borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: '#334155',
  },
  problemTitle: { fontSize: 14, fontWeight: '600', color: '#E2E8F0', marginBottom: 6 },
  problemMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  problemUpvotes: { fontSize: 12, color: '#10B981' },
  problemLocation: { fontSize: 11, color: '#475569' },
});
