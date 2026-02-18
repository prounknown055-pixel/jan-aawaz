import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase, castAnnualVote, getLeaderVoteStats } from '../../lib/supabase';
import { playTap } from '../../lib/sounds';

export default function AnnualVote() {
  const router = useRouter();
  const [leaders, setLeaders] = useState([]);
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [votedLeaders, setVotedLeaders] = useState({});
  const [voteStats, setVoteStats] = useState({});

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadUser(), loadLeaders(), loadSettings()]);
    setLoading(false);
  };

  const loadUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data } = await supabase.from('users').select('*').eq('id', authUser.id).single();
      setUser(data);
      const year = new Date().getFullYear();
      const { data: myVotes } = await supabase
        .from('annual_votes')
        .select('leader_id, vote_type')
        .eq('voter_id', authUser.id)
        .eq('year', year);
      const voted = {};
      myVotes?.forEach(v => { voted[v.leader_id] = v.vote_type; });
      setVotedLeaders(voted);
    }
  };

  const loadLeaders = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'leader')
      .eq('leader_verified', true)
      .eq('is_blocked', false)
      .order('popularity_score', { ascending: false });
    setLeaders(data || []);

    const stats = {};
    for (const l of data || []) {
      const { data: s } = await getLeaderVoteStats(l.id);
      if (s) stats[l.id] = s;
    }
    setVoteStats(stats);
  };

  const loadSettings = async () => {
    const { data } = await supabase.from('app_settings').select('voting_open, annual_voting_date').single();
    setSettings(data);
  };

  const handleVote = async (leaderId, voteType) => {
    await playTap();
    if (!settings?.voting_open) {
      Alert.alert('Voting Band Hai', 'Abhi voting ka samay nahi hai. Jan 1 ko vote kar sakte ho ya jab admin khole.');
      return;
    }
    if (!user) { Alert.alert('Login Karo', 'Vote karne ke liye login karo.'); return; }
    if (user.id === leaderId) { Alert.alert('Error', 'Khud ko vote nahi kar sakte.'); return; }

    const alreadyVoted = votedLeaders[leaderId];
    if (alreadyVoted) {
      Alert.alert(
        'Pehle Se Vote Diya',
        `Aapne pehle se ${alreadyVoted === 'positive' ? '👍' : '👎'} vote diya hai. Badalna chahte ho?`,
        [
          { text: 'Nahi', style: 'cancel' },
          {
            text: 'Haan Badlo',
            onPress: async () => {
              const { error } = await castAnnualVote(user.id, leaderId, voteType);
              if (!error) {
                setVotedLeaders(prev => ({ ...prev, [leaderId]: voteType }));
                await loadLeaders();
              }
            },
          },
        ]
      );
      return;
    }

    const { error } = await castAnnualVote(user.id, leaderId, voteType);
    if (error) {
      Alert.alert('Error', 'Vote nahi diya ja saka.');
    } else {
      setVotedLeaders(prev => ({ ...prev, [leaderId]: voteType }));
      await loadLeaders();
      Alert.alert('✅ Vote Diya!', `Aapne ${voteType === 'positive' ? '👍' : '👎'} vote diya.`);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const renderLeader = ({ item }) => {
    const stats = voteStats[item.id];
    const total = stats?.total || 0;
    const posPercent = total > 0 ? Math.round((stats.positive / total) * 100) : 0;
    const negPercent = total > 0 ? Math.round((stats.negative / total) * 100) : 0;
    const myVote = votedLeaders[item.id];

    return (
      <View style={styles.leaderCard}>
        <TouchableOpacity
          style={styles.leaderTop}
          onPress={async () => { await playTap(); router.push(`/leader/${item.id}`); }}
        >
          <View style={[styles.avatar, { borderColor: item.leader_badge_color || '#6B7280' }]}>
            <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || '?'}</Text>
          </View>
          <View style={styles.leaderInfo}>
            <Text style={styles.leaderName}>{item.name}</Text>
            <View style={[styles.typeBadge, { backgroundColor: item.leader_badge_color || '#6B7280' }]}>
              <Text style={styles.typeBadgeText}>{item.leader_type}</Text>
            </View>
            <Text style={styles.leaderArea}>
              {[item.leader_area, item.leader_district, item.leader_state].filter(Boolean).join(', ')}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.voteBar}>
          <View style={[styles.voteBarPos, { flex: posPercent || 1 }]} />
          <View style={[styles.voteBarNeg, { flex: negPercent || 1 }]} />
        </View>
        <View style={styles.voteLabels}>
          <Text style={styles.votePosLabel}>👍 {posPercent}%</Text>
          <Text style={styles.voteTotalLabel}>{total} votes</Text>
          <Text style={styles.voteNegLabel}>👎 {negPercent}%</Text>
        </View>

        {myVote && (
          <View style={styles.myVoteBadge}>
            <Text style={styles.myVoteText}>
              Aapka vote: {myVote === 'positive' ? '👍 Positive' : '👎 Negative'}
            </Text>
          </View>
        )}

        <View style={styles.voteBtns}>
          <TouchableOpacity
            style={[styles.votePosBtn, myVote === 'positive' && styles.votedBtn]}
            onPress={() => handleVote(item.id, 'positive')}
          >
            <Text style={styles.voteBtnText}>👍 Achha Kaam</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.voteNegBtn, myVote === 'negative' && styles.votedBtn]}
            onPress={() => handleVote(item.id, 'negative')}
          >
            <Text style={styles.voteBtnText}>👎 Bura Kaam</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={async () => { await playTap(); router.back(); }}>
          <Text style={styles.backBtn}>← Wapas</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🗳️ Annual Voting</Text>
        <View style={{ width: 60 }} />
      </View>

      {!settings?.voting_open && (
        <View style={styles.closedBanner}>
          <Text style={styles.closedIcon}>🔒</Text>
          <Text style={styles.closedText}>
            Voting abhi band hai. Har saal Jan 1 ko khulti hai ya admin jab khole.
          </Text>
        </View>
      )}

      {settings?.voting_open && (
        <View style={styles.openBanner}>
          <Text style={styles.openText}>🗳️ Voting Chal Rahi Hai! Apne neta ko vote do.</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : (
        <FlatList
          data={leaders}
          keyExtractor={item => item.id}
          renderItem={renderLeader}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🗳️</Text>
              <Text style={styles.emptyText}>Koi verified leader nahi hai abhi</Text>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  backBtn: { fontSize: 14, color: '#FF6B35', fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#F1F5F9' },
  closedBanner: {
    backgroundColor: '#EF444410', padding: 14, flexDirection: 'row',
    alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#EF444430',
  },
  closedIcon: { fontSize: 20 },
  closedText: { fontSize: 13, color: '#EF4444', flex: 1, lineHeight: 18 },
  openBanner: {
    backgroundColor: '#10B98110', padding: 14, alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#10B98130',
  },
  openText: { fontSize: 14, color: '#10B981', fontWeight: '700' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 30 },
  leaderCard: {
    backgroundColor: '#1E293B', borderRadius: 16, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: '#334155',
  },
  leaderTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#0F172A',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, marginRight: 12,
  },
  avatarText: { fontSize: 22, fontWeight: '900', color: '#F1F5F9' },
  leaderInfo: { flex: 1 },
  leaderName: { fontSize: 17, fontWeight: '800', color: '#F1F5F9', marginBottom: 4 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 4 },
  typeBadgeText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  leaderArea: { fontSize: 12, color: '#64748B' },
  voteBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  voteBarPos: { backgroundColor: '#10B981' },
  voteBarNeg: { backgroundColor: '#EF4444' },
  voteLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  votePosLabel: { fontSize: 12, color: '#10B981', fontWeight: '700' },
  voteTotalLabel: { fontSize: 11, color: '#64748B' },
  voteNegLabel: { fontSize: 12, color: '#EF4444', fontWeight: '700' },
  myVoteBadge: {
    backgroundColor: '#FF6B3510', borderRadius: 8, padding: 6,
    alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#FF6B3530',
  },
  myVoteText: { fontSize: 12, color: '#FF6B35', fontWeight: '600' },
  voteBtns: { flexDirection: 'row', gap: 10 },
  votePosBtn: {
    flex: 1, backgroundColor: '#10B98120', borderWidth: 1, borderColor: '#10B981',
    borderRadius: 12, paddingVertical: 10, alignItems: 'center',
  },
  voteNegBtn: {
    flex: 1, backgroundColor: '#EF444420', borderWidth: 1, borderColor: '#EF4444',
    borderRadius: 12, paddingVertical: 10, alignItems: 'center',
  },
  votedBtn: { opacity: 0.6 },
  voteBtnText: { fontSize: 13, color: '#F1F5F9', fontWeight: '700' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#64748B' },
});
