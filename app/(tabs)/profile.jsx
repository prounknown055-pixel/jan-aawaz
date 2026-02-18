import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, RefreshControl, Image, Animated
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { signOut } from '../../lib/auth';
import { playTap } from '../../lib/sounds';

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [myProblems, setMyProblems] = useState([]);
  const [myProtests, setMyProtests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadProfile();
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const loadProfile = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { router.replace('/login'); return; }

    const { data } = await supabase.from('users').select('*').eq('id', authUser.id).single();
    setUser(data);

    const { data: problems } = await supabase
      .from('problems')
      .select('id, title, category, upvote_count, created_at, is_anonymous')
      .eq('user_id', authUser.id)
      .eq('is_removed', false)
      .order('created_at', { ascending: false })
      .limit(10);
    setMyProblems(problems || []);

    const { data: protests } = await supabase
      .from('protest_members')
      .select('protest_id, role, protest_groups(id, title, member_count, is_active)')
      .eq('user_id', authUser.id)
      .limit(10);
    setMyProtests(protests || []);

    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleSignOut = async () => {
    await playTap();
    Alert.alert(
      'Logout',
      'Kya aap logout karna chahte ho?',
      [
        { text: 'Nahi', style: 'cancel' },
        {
          text: 'Haan',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const handleLeaderRequest = async () => {
    await playTap();
    router.push('/leader/request-badge');
  };

  const getTimeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days} din pehle`;
    const hrs = Math.floor(diff / 3600000);
    if (hrs > 0) return `${hrs} ghante pehle`;
    return 'Abhi';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Profile load ho rahi hai...</Text>
      </View>
    );
  }

  const isLeader = user?.role === 'leader';
  const isAdmin = user?.role === 'admin';

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>👤 Profile</Text>
          {isAdmin && (
            <TouchableOpacity
              style={styles.adminPanelBtn}
              onPress={async () => { await playTap(); router.push('/admin/dashboard'); }}
            >
              <Text style={styles.adminPanelBtnText}>⚙️ Admin Panel</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={[
            styles.avatarCircle,
            isLeader && { borderColor: user?.leader_badge_color || '#FF6B35' },
            isAdmin && { borderColor: '#FF6B35' },
          ]}>
            <Text style={styles.avatarText}>
              {user?.name?.[0]?.toUpperCase() || '?'}
            </Text>
            {isLeader && user?.leader_verified && (
              <View style={styles.verifiedTick}>
                <Text style={styles.verifiedTickText}>✓</Text>
              </View>
            )}
          </View>

          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userHandle}>@{user?.username}</Text>

          <View style={styles.badgeRow}>
            {isAdmin && (
              <View style={[styles.badge, { backgroundColor: '#FF6B35' }]}>
                <Text style={styles.badgeText}>⚙️ Admin</Text>
              </View>
            )}
            {isLeader && (
              <View style={[styles.badge, { backgroundColor: user?.leader_badge_color || '#6B7280' }]}>
                <Text style={styles.badgeText}>
                  {user?.leader_type || 'Leader'} • {user?.leader_area}
                </Text>
              </View>
            )}
            {!isLeader && !isAdmin && (
              <View style={[styles.badge, { backgroundColor: '#334155' }]}>
                <Text style={styles.badgeText}>🇮🇳 Citizen</Text>
              </View>
            )}
          </View>

          {user?.bio && <Text style={styles.bio}>{user.bio}</Text>}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{user?.follower_count || 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{user?.following_count || 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{myProblems.length}</Text>
              <Text style={styles.statLabel}>Problems</Text>
            </View>
            {isLeader && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statNum, { color: '#FF6B35' }]}>{user?.popularity_score || 0}</Text>
                  <Text style={styles.statLabel}>Popularity</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Leader Special Section */}
        {isLeader && (
          <View style={styles.leaderSection}>
            <Text style={styles.sectionTitle}>👑 Leader Dashboard</Text>

            <View style={styles.leaderStats}>
              <View style={styles.leaderStatCard}>
                <Text style={styles.leaderStatIcon}>🗳️</Text>
                <Text style={styles.leaderStatNum}>{user?.total_votes_received || 0}</Text>
                <Text style={styles.leaderStatLabel}>Total Votes</Text>
              </View>
              <View style={styles.leaderStatCard}>
                <Text style={styles.leaderStatIcon}>⚖️</Text>
                <Text style={styles.leaderStatNum}>{user?.total_cases_filed || 0}</Text>
                <Text style={styles.leaderStatLabel}>Cases</Text>
              </View>
              <View style={styles.leaderStatCard}>
                <Text style={styles.leaderStatIcon}>💰</Text>
                <Text style={[styles.leaderStatNum, { color: '#EF4444' }]}>
                  ₹{((user?.scam_wallet_amount || 0) / 100).toLocaleString('en-IN')}
                </Text>
                <Text style={styles.leaderStatLabel}>Scam Wallet</Text>
              </View>
            </View>

            {user?.pending_works?.length > 0 && (
              <View style={styles.worksBox}>
                <Text style={styles.worksTitle}>⏳ Pending Kaam</Text>
                {user.pending_works.map((work, i) => (
                  <View key={i} style={styles.workItem}>
                    <Text style={styles.workDot}>•</Text>
                    <Text style={styles.workText}>{work}</Text>
                  </View>
                ))}
              </View>
            )}

            {user?.completed_works?.length > 0 && (
              <View style={[styles.worksBox, { borderLeftColor: '#10B981' }]}>
                <Text style={[styles.worksTitle, { color: '#10B981' }]}>✅ Completed Kaam</Text>
                {user.completed_works.map((work, i) => (
                  <View key={i} style={styles.workItem}>
                    <Text style={styles.workDot}>•</Text>
                    <Text style={styles.workText}>{work}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* My Problems */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Mere Problems</Text>
          {myProblems.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>Koi problem post nahi ki abhi</Text>
            </View>
          ) : (
            myProblems.map(p => (
              <TouchableOpacity
                key={p.id}
                style={styles.problemItem}
                onPress={async () => { await playTap(); router.push(`/problem/${p.id}`); }}
              >
                <Text style={styles.problemItemTitle} numberOfLines={1}>{p.title}</Text>
                <View style={styles.problemItemMeta}>
                  <Text style={styles.problemItemUpvotes}>👍 {p.upvote_count || 0}</Text>
                  <Text style={styles.problemItemTime}>{getTimeAgo(p.created_at)}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* My Protests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✊ Mere Protests</Text>
          {myProtests.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>Koi protest join nahi kiya abhi</Text>
            </View>
          ) : (
            myProtests.map(p => (
              <TouchableOpacity
                key={p.protest_id}
                style={styles.protestItem}
                onPress={async () => { await playTap(); router.push(`/protest/${p.protest_id}`); }}
              >
                <Text style={styles.protestItemTitle} numberOfLines={1}>
                  {p.protest_groups?.title}
                </Text>
                <View style={styles.protestItemMeta}>
                  <View style={[styles.rolePill, p.role === 'owner' && styles.rolePillOwner]}>
                    <Text style={styles.rolePillText}>{p.role}</Text>
                  </View>
                  <Text style={styles.protestItemMembers}>
                    👥 {p.protest_groups?.member_count || 0}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          {!isLeader && !isAdmin && (
            <TouchableOpacity style={styles.actionBtn} onPress={handleLeaderRequest}>
              <Text style={styles.actionBtnIcon}>👑</Text>
              <View style={styles.actionBtnText}>
                <Text style={styles.actionBtnTitle}>Leader Badge Request Karo</Text>
                <Text style={styles.actionBtnSub}>MLA, MP, CM wagara hain? Verify karao</Text>
              </View>
              <Text style={styles.actionBtnArrow}>→</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={async () => { await playTap(); router.push('/voting/annual-vote'); }}
          >
            <Text style={styles.actionBtnIcon}>🗳️</Text>
            <View style={styles.actionBtnText}>
              <Text style={styles.actionBtnTitle}>Annual Voting</Text>
              <Text style={styles.actionBtnSub}>Apne neta ko vote do</Text>
            </View>
            <Text style={styles.actionBtnArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.logoutBtn]} onPress={handleSignOut}>
            <Text style={styles.actionBtnIcon}>🚪</Text>
            <View style={styles.actionBtnText}>
              <Text style={[styles.actionBtnTitle, { color: '#EF4444' }]}>Logout</Text>
              <Text style={styles.actionBtnSub}>Account se bahar jao</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  loadingContainer: { flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#64748B', fontSize: 14 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#F1F5F9' },
  adminPanelBtn: {
    backgroundColor: '#FF6B35', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
  },
  adminPanelBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  profileCard: {
    backgroundColor: '#1E293B', margin: 16, borderRadius: 20, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: '#334155',
  },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#0F172A',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#334155', marginBottom: 12, position: 'relative',
  },
  avatarText: { fontSize: 36, fontWeight: '900', color: '#F1F5F9' },
  verifiedTick: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: '#10B981', width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#1E293B',
  },
  verifiedTickText: { fontSize: 11, color: '#fff', fontWeight: '900' },
  userName: { fontSize: 22, fontWeight: '900', color: '#F1F5F9', marginBottom: 4 },
  userHandle: { fontSize: 14, color: '#64748B', marginBottom: 12 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap', justifyContent: 'center' },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 12, color: '#fff', fontWeight: '700' },
  bio: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: 12, lineHeight: 20 },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    width: '100%', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#334155',
  },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '900', color: '#F1F5F9' },
  statLabel: { fontSize: 11, color: '#64748B', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#334155' },
  leaderSection: { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#F1F5F9', marginBottom: 12, paddingHorizontal: 16 },
  leaderStats: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  leaderStatCard: {
    flex: 1, backgroundColor: '#1E293B', borderRadius: 14, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#334155',
  },
  leaderStatIcon: { fontSize: 24, marginBottom: 6 },
  leaderStatNum: { fontSize: 18, fontWeight: '900', color: '#F1F5F9' },
  leaderStatLabel: { fontSize: 10, color: '#64748B', marginTop: 2 },
  worksBox: {
    backgroundColor: '#1E293B', borderRadius: 14, padding: 14,
    borderLeftWidth: 4, borderLeftColor: '#F59E0B', marginBottom: 10,
  },
  worksTitle: { fontSize: 13, fontWeight: '700', color: '#F59E0B', marginBottom: 8 },
  workItem: { flexDirection: 'row', marginBottom: 4 },
  workDot: { color: '#64748B', marginRight: 6 },
  workText: { fontSize: 13, color: '#94A3B8', flex: 1 },
  section: { marginBottom: 8 },
  emptySection: {
    marginHorizontal: 16, backgroundColor: '#1E293B', borderRadius: 12,
    padding: 16, alignItems: 'center',
  },
  emptySectionText: { fontSize: 13, color: '#475569' },
  problemItem: {
    backgroundColor: '#1E293B', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#334155',
  },
  problemItemTitle: { fontSize: 14, fontWeight: '600', color: '#E2E8F0', marginBottom: 6 },
  problemItemMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  problemItemUpvotes: { fontSize: 12, color: '#10B981' },
  problemItemTime: { fontSize: 11, color: '#475569' },
  protestItem: {
    backgroundColor: '#1E293B', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#334155',
  },
  protestItemTitle: { fontSize: 14, fontWeight: '600', color: '#E2E8F0', marginBottom: 6 },
  protestItemMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rolePill: {
    backgroundColor: '#334155', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
  },
  rolePillOwner: { backgroundColor: '#FF6B3530', borderWidth: 1, borderColor: '#FF6B35' },
  rolePillText: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  protestItemMembers: { fontSize: 12, color: '#64748B' },
  actionsSection: { padding: 16, gap: 10 },
  actionBtn: {
    backgroundColor: '#1E293B', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#334155',
  },
  logoutBtn: { borderColor: '#EF444440' },
  actionBtnIcon: { fontSize: 26, marginRight: 14 },
  actionBtnText: { flex: 1 },
  actionBtnTitle: { fontSize: 15, fontWeight: '700', color: '#F1F5F9' },
  actionBtnSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  actionBtnArrow: { fontSize: 18, color: '#64748B' },
});
