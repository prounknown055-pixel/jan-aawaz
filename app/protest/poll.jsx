import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator
} from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { playTap } from '../../lib/sounds';

export default function PollScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [poll, setPoll] = useState(null);
  const [user, setUser] = useState(null);
  const [myVote, setMyVote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  useEffect(() => { loadAll(); }, [id]);

  const loadAll = async () => {
    setLoading(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data } = await supabase.from('users').select('*').eq('id', authUser.id).single();
      setUser(data);
      const { data: myVoteData } = await supabase
        .from('poll_votes')
        .select('option_index')
        .eq('poll_id', id)
        .eq('user_id', authUser.id)
        .single();
      if (myVoteData) setMyVote(myVoteData.option_index);
    }

    const { data: pollData } = await supabase
      .from('polls')
      .select('*, users!polls_created_by_fkey(id, username)')
      .eq('id', id)
      .single();
    setPoll(pollData);
    setLoading(false);
  };

  const handleVote = async (optionIndex) => {
    await playTap();
    if (!user) { Alert.alert('Login Karo', 'Vote karne ke liye login karo.'); return; }
    if (myVote !== null) { Alert.alert('Already Voted', 'Aap pehle vote kar chuke ho.'); return; }
    if (!poll?.is_active) { Alert.alert('Band Hai', 'Ye poll band ho gayi hai.'); return; }

    setVoting(true);
    const { error } = await supabase.from('poll_votes').insert({
      poll_id: id, user_id: user.id, option_index: optionIndex,
    });

    if (!error) {
      const updatedOptions = [...poll.options];
      updatedOptions[optionIndex].votes = (updatedOptions[optionIndex].votes || 0) + 1;
      await supabase.from('polls').update({
        options: updatedOptions,
        total_votes: (poll.total_votes || 0) + 1,
      }).eq('id', id);
      setMyVote(optionIndex);
      await loadAll();
    }
    setVoting(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (!poll) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.notFound}>Poll nahi mila</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Wapas</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={async () => { await playTap(); router.back(); }}>
          <Text style={styles.backBtn}>← Wapas</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>📊 Poll</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.pollCard}>
          <View style={styles.pollHeader}>
            <Text style={styles.pollIcon}>📊</Text>
            {poll.is_active ? (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>🟢 Active</Text>
              </View>
            ) : (
              <View style={styles.closedBadge}>
                <Text style={styles.closedBadgeText}>🔴 Band</Text>
              </View>
            )}
          </View>

          <Text style={styles.question}>{poll.question}</Text>
          <Text style={styles.totalVotes}>Total Votes: {poll.total_votes || 0}</Text>

          {myVote !== null && (
            <View style={styles.myVoteBadge}>
              <Text style={styles.myVoteText}>
                ✅ Aapne option {myVote + 1} choose kiya
              </Text>
            </View>
          )}

          <View style={styles.optionsContainer}>
            {poll.options.map((opt, idx) => {
              const percent = poll.total_votes > 0
                ? Math.round(((opt.votes || 0) / poll.total_votes) * 100) : 0;
              const isMyVote = myVote === idx;

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.optionCard,
                    isMyVote && styles.optionCardSelected,
                  ]}
                  onPress={() => handleVote(idx)}
                  disabled={myVote !== null || voting || !poll.is_active}
                  activeOpacity={0.8}
                >
                  <View style={styles.optionHeader}>
                    <Text style={[styles.optionText, isMyVote && styles.optionTextSelected]}>
                      {opt.text}
                    </Text>
                    <Text style={[styles.optionPercent, isMyVote && { color: '#fff' }]}>
                      {percent}%
                    </Text>
                  </View>

                  <View style={styles.optionBarBg}>
                    <View style={[
                      styles.optionBarFill,
                      { width: `${percent}%` },
                      isMyVote && { backgroundColor: '#fff' },
                    ]} />
                  </View>

                  <Text style={[styles.optionVotes, isMyVote && { color: '#FFD4C2' }]}>
                    {opt.votes || 0} votes
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {!poll.is_active && (
            <View style={styles.closedBanner}>
              <Text style={styles.closedBannerText}>🔒 Ye poll band ho gayi hai</Text>
            </View>
          )}

          {!user && poll.is_active && (
            <View style={styles.loginBanner}>
              <Text style={styles.loginBannerText}>
                Vote karne ke liye login karo
              </Text>
            </View>
          )}
        </View>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  backBtn: { fontSize: 14, color: '#FF6B35', fontWeight: '600' },
  topBarTitle: { fontSize: 18, fontWeight: '900', color: '#F1F5F9' },
  content: { padding: 16 },
  pollCard: {
    backgroundColor: '#1E293B', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#334155',
  },
  pollHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  pollIcon: { fontSize: 32 },
  activeBadge: { backgroundColor: '#10B98120', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  activeBadgeText: { fontSize: 12, color: '#10B981', fontWeight: '700' },
  closedBadge: { backgroundColor: '#EF444420', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  closedBadgeText: { fontSize: 12, color: '#EF4444', fontWeight: '700' },
  question: { fontSize: 20, fontWeight: '800', color: '#F1F5F9', marginBottom: 8, lineHeight: 28 },
  totalVotes: { fontSize: 13, color: '#64748B', marginBottom: 14 },
  myVoteBadge: {
    backgroundColor: '#FF6B3520', borderRadius: 10, padding: 10,
    marginBottom: 14, borderWidth: 1, borderColor: '#FF6B3540',
  },
  myVoteText: { fontSize: 13, color: '#FF6B35', textAlign: 'center', fontWeight: '600' },
  optionsContainer: { gap: 10 },
  optionCard: {
    backgroundColor: '#0F172A', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#334155',
  },
  optionCardSelected: { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
  optionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  optionText: { fontSize: 15, color: '#E2E8F0', fontWeight: '600', flex: 1 },
  optionTextSelected: { color: '#fff' },
  optionPercent: { fontSize: 15, color: '#FF6B35', fontWeight: '800' },
  optionBarBg: {
    height: 6, backgroundColor: '#334155', borderRadius: 3, marginBottom: 4,
  },
  optionBarFill: { height: 6, backgroundColor: '#FF6B35', borderRadius: 3 },
  optionVotes: { fontSize: 11, color: '#475569' },
  closedBanner: {
    backgroundColor: '#EF444410', borderRadius: 10, padding: 12,
    marginTop: 14, alignItems: 'center',
  },
  closedBannerText: { fontSize: 13, color: '#EF4444', fontWeight: '600' },
  loginBanner: {
    backgroundColor: '#3B82F610', borderRadius: 10, padding: 12,
    marginTop: 14, alignItems: 'center',
  },
  loginBannerText: { fontSize: 13, color: '#60A5FA', fontWeight: '600' },
});
