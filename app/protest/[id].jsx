import {
  View, Text, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, RefreshControl
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase, joinProtest, getProtestChat, subscribeProtestChat } from '../../lib/supabase';
import { playTap } from '../../lib/sounds';

export default function ProtestDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [protest, setProtest] = useState(null);
  const [user, setUser] = useState(null);
  const [membership, setMembership] = useState(null);
  const [messages, setMessages] = useState([]);
  const [polls, setPolls] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showPollCreate, setShowPollCreate] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const flatListRef = useRef(null);
  const subscription = useRef(null);

  useEffect(() => {
    loadAll();
    return () => { if (subscription.current) subscription.current.unsubscribe(); };
  }, [id]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadProtest(), loadUser()]);
    setLoading(false);
  };

  const loadProtest = async () => {
    const { data } = await supabase
      .from('protest_groups')
      .select(`*, users!protest_groups_created_by_fkey(id, username, avatar_url, role)`)
      .eq('id', id)
      .single();
    setProtest(data);
  };

  const loadUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const { data } = await supabase.from('users').select('*').eq('id', authUser.id).single();
    setUser(data);
    const { data: mem } = await supabase
      .from('protest_members')
      .select('*')
      .eq('protest_id', id)
      .eq('user_id', authUser.id)
      .single();
    setMembership(mem);
    if (mem?.is_approved) {
      await loadMessages(authUser.id);
      subscribeToChat();
    } else {
      await loadPublicMessages();
    }
    await loadPolls();
  };

  const loadMessages = async (userId) => {
    const { data } = await getProtestChat(id, userId);
    setMessages(data || []);
  };

  const loadPublicMessages = async () => {
    const { data } = await supabase
      .from('protest_chat')
      .select(`*, users!protest_chat_user_id_fkey(id, username, avatar_url, role)`)
      .eq('protest_id', id)
      .eq('is_public', true)
      .eq('is_removed', false)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  };

  const loadPolls = async () => {
    const { data } = await supabase
      .from('polls')
      .select('*')
      .eq('protest_id', id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    setPolls(data || []);
  };

  const subscribeToChat = () => {
    subscription.current = subscribeProtestChat(id, async (payload) => {
      const { data } = await supabase
        .from('protest_chat')
        .select(`*, users!protest_chat_user_id_fkey(id, username, avatar_url, role)`)
        .eq('id', payload.new.id)
        .single();
      if (data) setMessages(prev => [...prev, data]);
    });
  };

  const handleJoin = async () => {
    await playTap();
    if (!user) { Alert.alert('Login Karo', 'Join karne ke liye login karo.'); return; }
    const { data, error } = await joinProtest(id, user.id);
    if (error) {
      if (error.code === '23505') {
        Alert.alert('Already Joined', 'Aap pehle se is group mein hain.');
      } else {
        Alert.alert('Error', 'Join nahi ho saka. Dobara try karo.');
      }
      return;
    }
    if (protest?.is_public_join) {
      Alert.alert('✅ Join Ho Gaye!', 'Aap group mein shamil ho gaye.');
    } else {
      Alert.alert('⏳ Request Gayi!', 'Group admin approve karega.');
    }
    await loadUser();
  };

  const handleSendMessage = async () => {
    await playTap();
    if (!message.trim()) return;
    if (!membership?.is_approved) {
      Alert.alert('Approved Nahi Ho', 'Pehle group mein join hona padega.');
      return;
    }
    setSending(true);
    const isOwner = membership?.role === 'owner' || membership?.role === 'admin';
    await supabase.from('protest_chat').insert({
      protest_id: id,
      user_id: user.id,
      message: message.trim(),
      is_public: isOwner ? true : false,
    });
    setMessage('');
    setSending(false);
  };

  const handleMakePublic = async (msgId) => {
    await playTap();
    await supabase.from('protest_chat').update({ is_public: true }).eq('id', msgId);
    await loadMessages(user.id);
  };

  const handlePinMessage = async (msgId) => {
    await playTap();
    await supabase.from('protest_chat').update({ is_pinned: true }).eq('id', msgId);
    await supabase.from('protest_groups').update({ chat_pinned_message_id: msgId }).eq('id', id);
    await loadMessages(user.id);
  };

  const handleRemoveMessage = async (msgId) => {
    await playTap();
    await supabase.from('protest_chat').update({ is_removed: true }).eq('id', msgId);
    await loadMessages(user.id);
  };

  const handleDisableChat = async () => {
    await playTap();
    Alert.alert(
      'Chat Band Karo?',
      'Sirf pinned messages dikhenge.',
      [
        { text: 'Nahi', style: 'cancel' },
        {
          text: 'Haan',
          onPress: async () => {
            await supabase.from('protest_groups').update({ is_chat_enabled: false }).eq('id', id);
            await loadProtest();
          },
        },
      ]
    );
  };

  const handleCreatePoll = async () => {
    await playTap();
    if (!pollQuestion.trim()) { Alert.alert('Error', 'Question likho.'); return; }
    const validOptions = pollOptions.filter(o => o.trim());
    if (validOptions.length < 2) { Alert.alert('Error', 'Kam se kam 2 options chahiye.'); return; }

    const optionsData = validOptions.map(o => ({ text: o.trim(), votes: 0 }));
    const { data: chatMsg } = await supabase.from('protest_chat').insert({
      protest_id: id, user_id: user.id,
      message: `📊 Poll: ${pollQuestion}`, is_poll: true, is_public: true,
    }).select().single();

    await supabase.from('polls').insert({
      protest_id: id,
      protest_chat_id: chatMsg.id,
      created_by: user.id,
      question: pollQuestion.trim(),
      options: optionsData,
    });

    setPollQuestion('');
    setPollOptions(['', '']);
    setShowPollCreate(false);
    await loadPolls();
    Alert.alert('✅ Poll Bana!');
  };

  const handleVotePoll = async (pollId, optionIndex) => {
    await playTap();
    if (!user) { Alert.alert('Login Karo', 'Vote karne ke liye login karo.'); return; }
    const { error } = await supabase.from('poll_votes').insert({
      poll_id: pollId, user_id: user.id, option_index: optionIndex,
    });
    if (error?.code === '23505') {
      Alert.alert('Already Voted', 'Aap pehle vote kar chuke ho.');
      return;
    }
    const poll = polls.find(p => p.id === pollId);
    const updatedOptions = [...poll.options];
    updatedOptions[optionIndex].votes = (updatedOptions[optionIndex].votes || 0) + 1;
    await supabase.from('polls').update({
      options: updatedOptions,
      total_votes: (poll.total_votes || 0) + 1,
    }).eq('id', pollId);
    await loadPolls();
  };

  const isOwnerOrAdmin = membership?.role === 'owner' || membership?.role === 'admin';
  const isAppAdmin = user?.role === 'admin';

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const getTimeAgo = (d) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h`;
    if (m > 0) return `${m}m`;
    return 'Abhi';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (!protest) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.notFound}>Protest nahi mila</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Wapas</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.topBar}>
        <TouchableOpacity onPress={async () => { await playTap(); router.back(); }}>
          <Text style={styles.backBtn}>← Wapas</Text>
        </TouchableOpacity>
        {(isOwnerOrAdmin || isAppAdmin) && (
          <View style={styles.ownerActions}>
            {protest.is_chat_enabled && (
              <TouchableOpacity style={styles.ownerBtn} onPress={handleDisableChat}>
                <Text style={styles.ownerBtnText}>🔕 Chat Band</Text>
              </TouchableOpacity>
            )}
            {isOwnerOrAdmin && (
              <TouchableOpacity
                style={styles.ownerBtn}
                onPress={async () => { await playTap(); setShowPollCreate(!showPollCreate); }}
              >
                <Text style={styles.ownerBtnText}>📊 Poll</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Protest Info */}
        <View style={styles.protestCard}>
          <View style={styles.protestHeader}>
            <Text style={styles.protestEmoji}>✊</Text>
            <View style={styles.protestBadges}>
              {protest.is_admin_created && (
                <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>⚙️ Admin</Text></View>
              )}
              {protest.payment_verified && (
                <View style={styles.verifiedBadge}><Text style={styles.verifiedBadgeText}>✅ Verified</Text></View>
              )}
              <View style={[styles.statusBadge, { backgroundColor: protest.is_active ? '#10B98120' : '#EF444420' }]}>
                <Text style={[styles.statusText, { color: protest.is_active ? '#10B981' : '#EF4444' }]}>
                  {protest.is_active ? '🟢 Active' : '🔴 Inactive'}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.protestTitle}>{protest.title}</Text>
          {protest.description && (
            <Text style={styles.protestDesc}>{protest.description}</Text>
          )}

          <View style={styles.protestMeta}>
            <Text style={styles.metaText}>
              📍 {[protest.village, protest.block, protest.district, protest.state].filter(Boolean).join(', ')}
            </Text>
            <Text style={styles.metaText}>👥 {protest.member_count || 0} Members</Text>
            <Text style={styles.metaText}>
              {protest.is_public_join ? '🔓 Open Join' : '🔒 Permission Chahiye'}
            </Text>
            <Text style={styles.metaText}>
              By: @{protest.users?.username || 'Unknown'}
            </Text>
          </View>

          {!membership && (
            <TouchableOpacity style={styles.joinBtn} onPress={handleJoin}>
              <Text style={styles.joinBtnText}>
                {protest.is_public_join ? '✊ Abhi Join Karo' : '📩 Join Request Bhejo'}
              </Text>
            </TouchableOpacity>
          )}

          {membership && !membership.is_approved && (
            <View style={styles.pendingBox}>
              <Text style={styles.pendingText}>⏳ Join request pending hai. Admin approve karega.</Text>
            </View>
          )}

          {membership?.is_approved && (
            <View style={styles.joinedBox}>
              <Text style={styles.joinedText}>✅ Aap Is Group Ke Member Ho</Text>
              {membership.role !== 'member' && (
                <View style={styles.rolePill}>
                  <Text style={styles.rolePillText}>{membership.role}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Polls */}
        {polls.length > 0 && (
          <View style={styles.pollsSection}>
            <Text style={styles.sectionTitle}>📊 Active Polls</Text>
            {polls.map(poll => (
              <View key={poll.id} style={styles.pollCard}>
                <Text style={styles.pollQuestion}>{poll.question}</Text>
                <Text style={styles.pollTotal}>Total Votes: {poll.total_votes || 0}</Text>
                {poll.options.map((opt, idx) => {
                  const percent = poll.total_votes > 0
                    ? Math.round(((opt.votes || 0) / poll.total_votes) * 100) : 0;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={styles.pollOption}
                      onPress={() => handleVotePoll(poll.id, idx)}
                    >
                      <View style={styles.pollOptionHeader}>
                        <Text style={styles.pollOptionText}>{opt.text}</Text>
                        <Text style={styles.pollPercent}>{percent}%</Text>
                      </View>
                      <View style={styles.pollBar}>
                        <View style={[styles.pollBarFill, { width: `${percent}%` }]} />
                      </View>
                      <Text style={styles.pollVotes}>{opt.votes || 0} votes</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        {/* Create Poll */}
        {showPollCreate && isOwnerOrAdmin && (
          <View style={styles.createPollBox}>
            <Text style={styles.sectionTitle}>📊 Naya Poll Banao</Text>
            <TextInput
              style={styles.pollInput}
              placeholder="Poll question likho..."
              placeholderTextColor="#475569"
              value={pollQuestion}
              onChangeText={setPollQuestion}
            />
            {pollOptions.map((opt, idx) => (
              <TextInput
                key={idx}
                style={styles.pollInput}
                placeholder={`Option ${idx + 1}`}
                placeholderTextColor="#475569"
                value={opt}
                onChangeText={(text) => {
                  const updated = [...pollOptions];
                  updated[idx] = text;
                  setPollOptions(updated);
                }}
              />
            ))}
            <View style={styles.pollBtns}>
              <TouchableOpacity
                style={styles.addOptionBtn}
                onPress={async () => { await playTap(); setPollOptions([...pollOptions, '']); }}
              >
                <Text style={styles.addOptionText}>+ Option Add Karo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createPollBtn} onPress={handleCreatePoll}>
                <Text style={styles.createPollBtnText}>Poll Banao</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Chat Section */}
        <View style={styles.chatSection}>
          <Text style={styles.sectionTitle}>
            💬 Group Chat
            {!protest.is_chat_enabled && ' (Band Hai)'}
          </Text>

          {messages.length === 0 ? (
            <View style={styles.emptyChatBox}>
              <Text style={styles.emptyChatText}>Koi message nahi hai abhi</Text>
            </View>
          ) : (
            messages.map(msg => (
              <View key={msg.id} style={[styles.msgCard, msg.is_pinned && styles.msgCardPinned]}>
                {msg.is_pinned && <Text style={styles.pinnedLabel}>📌 Pinned</Text>}
                <View style={styles.msgHeader}>
                  <Text style={styles.msgUsername}>@{msg.users?.username || 'Unknown'}</Text>
                  {msg.is_public && <Text style={styles.publicTag}>🌐 Public</Text>}
                  <Text style={styles.msgTime}>{getTimeAgo(msg.created_at)}</Text>
                </View>
                <Text style={styles.msgText}>{msg.message}</Text>
                {(isOwnerOrAdmin || isAppAdmin) && (
                  <View style={styles.msgActions}>
                    {!msg.is_public && (
                      <TouchableOpacity onPress={() => handleMakePublic(msg.id)}>
                        <Text style={styles.msgActionText}>🌐 Public Karo</Text>
                      </TouchableOpacity>
                    )}
                    {!msg.is_pinned && (
                      <TouchableOpacity onPress={() => handlePinMessage(msg.id)}>
                        <Text style={styles.msgActionText}>📌 Pin Karo</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => handleRemoveMessage(msg.id)}>
                      <Text style={[styles.msgActionText, { color: '#EF4444' }]}>🗑️ Hatao</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Chat Input */}
      {protest.is_chat_enabled && membership?.is_approved && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Message likho..."
            placeholderTextColor="#475569"
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!message.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSendMessage}
            disabled={!message.trim() || sending}
          >
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendIcon}>📤</Text>}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
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
    backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  backBtn: { fontSize: 14, color: '#FF6B35', fontWeight: '600' },
  ownerActions: { flexDirection: 'row', gap: 8 },
  ownerBtn: {
    backgroundColor: '#334155', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
  },
  ownerBtnText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  scroll: { flex: 1 },
  protestCard: {
    backgroundColor: '#1E293B', margin: 16, borderRadius: 20,
    padding: 20, borderWidth: 1, borderColor: '#334155',
  },
  protestHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  protestEmoji: { fontSize: 32 },
  protestBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  adminBadge: {
    backgroundColor: '#FF6B3520', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  adminBadgeText: { fontSize: 10, color: '#FF6B35', fontWeight: '700' },
  verifiedBadge: {
    backgroundColor: '#10B98120', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  verifiedBadgeText: { fontSize: 10, color: '#10B981', fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '700' },
  protestTitle: { fontSize: 20, fontWeight: '900', color: '#F1F5F9', marginBottom: 8 },
  protestDesc: { fontSize: 14, color: '#94A3B8', lineHeight: 22, marginBottom: 12 },
  protestMeta: { gap: 4, marginBottom: 14 },
  metaText: { fontSize: 13, color: '#64748B' },
  joinBtn: {
    backgroundColor: '#FF6B35', borderRadius: 16, paddingVertical: 14, alignItems: 'center',
    shadowColor: '#FF6B35', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  joinBtnText: { fontSize: 16, color: '#fff', fontWeight: '700' },
  pendingBox: {
    backgroundColor: '#F59E0B10', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#F59E0B30',
  },
  pendingText: { fontSize: 13, color: '#F59E0B', textAlign: 'center' },
  joinedBox: {
    backgroundColor: '#10B98110', borderRadius: 12, padding: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  joinedText: { fontSize: 13, color: '#10B981', fontWeight: '600' },
  rolePill: { backgroundColor: '#FF6B35', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  rolePillText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  pollsSection: { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#F1F5F9', marginBottom: 12, paddingHorizontal: 16 },
  pollCard: {
    backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#334155',
  },
  pollQuestion: { fontSize: 15, fontWeight: '700', color: '#F1F5F9', marginBottom: 4 },
  pollTotal: { fontSize: 11, color: '#64748B', marginBottom: 10 },
  pollOption: {
    backgroundColor: '#0F172A', borderRadius: 10, padding: 10, marginBottom: 8,
  },
  pollOptionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  pollOptionText: { fontSize: 13, color: '#E2E8F0', flex: 1 },
  pollPercent: { fontSize: 13, color: '#FF6B35', fontWeight: '700' },
  pollBar: { height: 6, backgroundColor: '#334155', borderRadius: 3, marginBottom: 3 },
  pollBarFill: { height: 6, backgroundColor: '#FF6B35', borderRadius: 3 },
  pollVotes: { fontSize: 10, color: '#475569' },
  createPollBox: { marginHorizontal: 16, marginBottom: 16 },
  pollInput: {
    backgroundColor: '#1E293B', borderRadius: 12, padding: 12,
    color: '#F1F5F9', fontSize: 14, borderWidth: 1, borderColor: '#334155', marginBottom: 8,
  },
  pollBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  addOptionBtn: {
    flex: 1, backgroundColor: '#1E293B', borderRadius: 12, padding: 10,
    alignItems: 'center', borderWidth: 1, borderColor: '#334155',
  },
  addOptionText: { fontSize: 13, color: '#94A3B8' },
  createPollBtn: {
    flex: 1, backgroundColor: '#FF6B35', borderRadius: 12, padding: 10, alignItems: 'center',
  },
  createPollBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  chatSection: { marginBottom: 8 },
  emptyChatBox: {
    marginHorizontal: 16, backgroundColor: '#1E293B', borderRadius: 12,
    padding: 24, alignItems: 'center',
  },
  emptyChatText: { fontSize: 14, color: '#475569' },
  msgCard: {
    backgroundColor: '#1E293B', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#334155',
  },
  msgCardPinned: { borderColor: '#F59E0B', backgroundColor: '#F59E0B08' },
  pinnedLabel: { fontSize: 11, color: '#F59E0B', fontWeight: '700', marginBottom: 6 },
  msgHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  msgUsername: { fontSize: 12, color: '#FF6B35', fontWeight: '700', flex: 1 },
  publicTag: { fontSize: 10, color: '#10B981', fontWeight: '600' },
  msgTime: { fontSize: 10, color: '#475569' },
  msgText: { fontSize: 14, color: '#E2E8F0', lineHeight: 22 },
  msgActions: { flexDirection: 'row', gap: 12, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#334155' },
  msgActionText: { fontSize: 12, color: '#60A5FA', fontWeight: '600' },
  inputContainer: {
    flexDirection: 'row', padding: 12, gap: 10, alignItems: 'flex-end',
    backgroundColor: '#1E293B', borderTopWidth: 1, borderTopColor: '#334155',
  },
  input: {
    flex: 1, backgroundColor: '#0F172A', borderRadius: 20, paddingHorizontal: 16,
    paddingVertical: 10, color: '#F1F5F9', fontSize: 14, maxHeight: 100,
    borderWidth: 1, borderColor: '#334155',
  },
  sendBtn: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#FF6B35',
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: { fontSize: 20 },
});
