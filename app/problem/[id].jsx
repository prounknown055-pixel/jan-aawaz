import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, Linking
} from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase, upvoteProblem } from '../../lib/supabase';
import { playTap } from '../../lib/sounds';

const CATEGORY_COLORS = {
  roads: '#F59E0B', water: '#3B82F6', electricity: '#EAB308',
  corruption: '#EF4444', women_safety: '#EC4899', health: '#10B981',
  education: '#8B5CF6', crime: '#F97316', political: '#6366F1',
  general: '#94A3B8', other: '#94A3B8', environment: '#84CC16', scam: '#EF4444',
};

export default function ProblemDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [problem, setProblem] = useState(null);
  const [user, setUser] = useState(null);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [upvoteLoading, setUpvoteLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    loadAll();
  }, [id]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadProblem(), loadUser()]);
    setLoading(false);
  };

  const loadProblem = async () => {
    const { data } = await supabase
      .from('problems')
      .select(`
        *,
        users!problems_user_id_fkey(id, username, avatar_url, role, leader_type, leader_badge_color)
      `)
      .eq('id', id)
      .single();
    setProblem(data);
  };

  const loadUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data } = await supabase.from('users').select('*').eq('id', authUser.id).single();
      setUser(data);
      const { data: upvote } = await supabase
        .from('problem_upvotes')
        .select('id')
        .eq('problem_id', id)
        .eq('user_id', authUser.id)
        .single();
      setHasUpvoted(!!upvote);
    }
  };

  const handleUpvote = async () => {
    await playTap();
    if (!user) { Alert.alert('Login Karo', 'Upvote karne ke liye login karo.'); return; }
    setUpvoteLoading(true);
    const { data } = await upvoteProblem(id, user.id);
    setHasUpvoted(data?.action === 'added');
    await loadProblem();
    setUpvoteLoading(false);
  };

  const handleReport = async () => {
    await playTap();
    if (!user) return;
    Alert.alert(
      'Report Karo',
      'Kya ye problem fake ya spam hai?',
      [
        { text: 'Nahi', style: 'cancel' },
        {
          text: 'Haan, Report Karo',
          style: 'destructive',
          onPress: async () => {
            setReportLoading(true);
            await supabase.from('reports').insert({
              reporter_id: user.id,
              content_type: 'problem',
              content_id: id,
              reason: 'Fake ya spam content',
            });
            Alert.alert('✅ Report Ho Gaya', 'Admin review karega.');
            setReportLoading(false);
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const getTimeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor(diff / 60000);
    if (days > 0) return `${days} din pehle`;
    if (hrs > 0) return `${hrs} ghante pehle`;
    if (mins > 0) return `${mins} min pehle`;
    return 'Abhi';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (!problem) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.notFound}>Problem nahi mili</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Wapas Jao</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const catColor = CATEGORY_COLORS[problem.category] || '#94A3B8';

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={async () => { await playTap(); router.back(); }}>
            <Text style={styles.backBtn}>← Wapas</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleReport} disabled={reportLoading}>
            <Text style={styles.reportBtn}>🚩 Report</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.badges}>
            <View style={[styles.catBadge, { backgroundColor: catColor + '30' }]}>
              <Text style={[styles.catText, { color: catColor }]}>{problem.category}</Text>
            </View>
            {problem.is_trending && (
              <View style={styles.trendingBadge}>
                <Text style={styles.trendingText}>🔥 Trending</Text>
              </View>
            )}
            {problem.is_anonymous && (
              <View style={styles.anonBadge}>
                <Text style={styles.anonText}>🎭 Anonymous</Text>
              </View>
            )}
            {problem.is_resolved && (
              <View style={styles.resolvedBadge}>
                <Text style={styles.resolvedText}>✅ Resolved</Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>{problem.title}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.timeText}>{getTimeAgo(problem.created_at)}</Text>
            {!problem.is_anonymous && problem.users && (
              <TouchableOpacity
                onPress={async () => {
                  await playTap();
                  if (problem.users?.role === 'leader') {
                    router.push(`/leader/${problem.user_id}`);
                  }
                }}
              >
                <Text style={styles.authorText}>
                  by @{problem.users?.username}
                  {problem.users?.role === 'leader' && ' 👑'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {problem.description && (
            <View style={styles.descBox}>
              <Text style={styles.descText}>{problem.description}</Text>
            </View>
          )}

          {problem.ai_summary && (
            <View style={styles.aiBox}>
              <Text style={styles.aiLabel}>🤖 AI Summary</Text>
              <Text style={styles.aiText}>{problem.ai_summary}</Text>
            </View>
          )}

          <View style={styles.locationBox}>
            <Text style={styles.locationTitle}>📍 Location</Text>
            <Text style={styles.locationText}>
              {[problem.village, problem.block, problem.district, problem.state, problem.country]
                .filter(Boolean).join(' → ')}
            </Text>
            {problem.latitude && (
              <Text style={styles.coordsText}>
                {problem.latitude.toFixed(4)}, {problem.longitude.toFixed(4)}
              </Text>
            )}
          </View>

          {problem.video_url && (
            <TouchableOpacity
              style={styles.videoBtn}
              onPress={async () => {
                await playTap();
                Linking.openURL(problem.video_url);
              }}
            >
              <Text style={styles.videoBtnText}>▶️ Video Dekho</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Upvote Section */}
        <View style={styles.upvoteSection}>
          <TouchableOpacity
            style={[styles.upvoteBtn, hasUpvoted && styles.upvoteBtnActive]}
            onPress={handleUpvote}
            disabled={upvoteLoading}
          >
            {upvoteLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.upvoteIcon}>{hasUpvoted ? '👍' : '👍'}</Text>
                <Text style={styles.upvoteText}>
                  {hasUpvoted ? 'Upvoted!' : 'Upvote Karo'}
                </Text>
                <Text style={styles.upvoteCount}>{problem.upvote_count || 0}</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.upvoteHint}>
            Zyada upvotes = Leader ko zyada pressure
          </Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  loadingContainer: { flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 16, color: '#64748B', marginBottom: 12 },
  backLink: { fontSize: 14, color: '#FF6B35' },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
  },
  backBtn: { fontSize: 14, color: '#FF6B35', fontWeight: '600' },
  reportBtn: { fontSize: 13, color: '#EF4444' },
  card: {
    backgroundColor: '#1E293B', margin: 16, borderRadius: 20,
    padding: 20, borderWidth: 1, borderColor: '#334155',
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  catBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  catText: { fontSize: 12, fontWeight: '700' },
  trendingBadge: { backgroundColor: '#FF6B3520', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  trendingText: { fontSize: 12, color: '#FF6B35', fontWeight: '700' },
  anonBadge: { backgroundColor: '#7C3AED20', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  anonText: { fontSize: 12, color: '#A78BFA', fontWeight: '700' },
  resolvedBadge: { backgroundColor: '#10B98120', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  resolvedText: { fontSize: 12, color: '#10B981', fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '900', color: '#F1F5F9', marginBottom: 8, lineHeight: 30 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  timeText: { fontSize: 12, color: '#475569' },
  authorText: { fontSize: 12, color: '#FF6B35', fontWeight: '600' },
  descBox: {
    backgroundColor: '#0F172A', borderRadius: 12, padding: 14, marginBottom: 12,
  },
  descText: { fontSize: 15, color: '#CBD5E1', lineHeight: 24 },
  aiBox: {
    backgroundColor: '#0F172A', borderRadius: 12, padding: 14,
    borderLeftWidth: 3, borderLeftColor: '#6366F1', marginBottom: 12,
  },
  aiLabel: { fontSize: 11, color: '#818CF8', fontWeight: '700', marginBottom: 6 },
  aiText: { fontSize: 13, color: '#C7D2FE', lineHeight: 20 },
  locationBox: {
    backgroundColor: '#0F172A', borderRadius: 12, padding: 14, marginBottom: 12,
  },
  locationTitle: { fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 6 },
  locationText: { fontSize: 14, color: '#94A3B8', lineHeight: 22 },
  coordsText: { fontSize: 11, color: '#475569', marginTop: 4 },
  videoBtn: {
    backgroundColor: '#EF444420', borderWidth: 1, borderColor: '#EF4444',
    borderRadius: 12, padding: 14, alignItems: 'center',
  },
  videoBtnText: { fontSize: 15, color: '#EF4444', fontWeight: '700' },
  upvoteSection: {
    marginHorizontal: 16, marginBottom: 16, alignItems: 'center',
  },
  upvoteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155',
    borderRadius: 20, paddingHorizontal: 28, paddingVertical: 14,
    width: '100%', justifyContent: 'center',
  },
  upvoteBtnActive: { backgroundColor: '#10B98120', borderColor: '#10B981' },
  upvoteIcon: { fontSize: 24 },
  upvoteText: { fontSize: 16, fontWeight: '700', color: '#F1F5F9' },
  upvoteCount: {
    fontSize: 20, fontWeight: '900', color: '#10B981',
    backgroundColor: '#10B98120', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10,
  },
  upvoteHint: { fontSize: 12, color: '#475569', marginTop: 8, textAlign: 'center' },
});
