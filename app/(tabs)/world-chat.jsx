import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, Animated
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { supabase, sendWorldChat, getWorldChat, subscribeWorldChat } from '../../lib/supabase';
import { summarizeWorldChatForLeader } from '../../lib/ai';
import { playTap } from '../../lib/sounds';

export default function WorldChatScreen() {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  const [aiSummary, setAiSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const flatListRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const subscription = useRef(null);

  useEffect(() => {
    init();
    return () => {
      if (subscription.current) subscription.current.unsubscribe();
    };
  }, []);

  const init = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data } = await supabase.from('users').select('*').eq('id', authUser.id).single();
      setUser(data);
      await loadDailyCount(data.id);
    }
    await loadMessages();
    setLoading(false);

    subscription.current = subscribeWorldChat(async (payload) => {
      const { data: fullMsg } = await supabase
        .from('world_chat')
        .select(`*, users!world_chat_user_id_fkey(id, username, avatar_url, role, leader_type, leader_badge_color, leader_verified)`)
        .eq('id', payload.new.id)
        .single();
      if (fullMsg) {
        setMessages(prev => [fullMsg, ...prev]);
      }
    });

    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  };

  const loadMessages = async () => {
    const { data } = await getWorldChat();
    setMessages(data || []);
  };

  const loadDailyCount = async (userId) => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('world_chat_daily')
      .select('message_count')
      .eq('user_id', userId)
      .eq('date', today)
      .single();
    setDailyCount(data?.message_count || 0);
  };

  const handleSend = async () => {
    await playTap();
    if (!message.trim()) return;
    if (dailyCount >= 5) {
      Alert.alert('Limit Ho Gayi', 'Aaj ke 5 messages ho gaye. Kal dobara aao!');
      return;
    }
    if (!user) {
      Alert.alert('Login Karo', 'Message bhejne ke liye login karo.');
      return;
    }

    setSending(true);
    const { data, error } = await sendWorldChat(user.id, message.trim());
    if (error) {
      Alert.alert('Error', error.message || 'Message nahi gaya. Dobara try karo.');
    } else {
      setMessage('');
      setDailyCount(prev => prev + 1);
    }
    setSending(false);
  };

  const getAiSummary = async () => {
    await playTap();
    setSummaryLoading(true);
    const summary = await summarizeWorldChatForLeader(messages.slice(0, 50));
    setAiSummary(summary);
    setSummaryLoading(false);
  };

  const getTimeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h`;
    if (mins > 0) return `${mins}m`;
    return 'Abhi';
  };

  const renderMessage = ({ item, index }) => {
    const isMe = item.user_id === user?.id;
    const isLeader = item.users?.role === 'leader';
    const isAdmin = item.users?.role === 'admin';

    return (
      <Animated.View style={[styles.msgRow, isMe && styles.msgRowMe, { opacity: fadeAnim }]}>
        {!isMe && (
          <View style={[
            styles.avatar,
            isLeader && { borderColor: item.users?.leader_badge_color || '#FF6B35', borderWidth: 2 },
            isAdmin && { borderColor: '#FF6B35', borderWidth: 2 },
          ]}>
            <Text style={styles.avatarText}>
              {item.users?.username?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
        )}
        <View style={[styles.msgContainer, isMe && styles.msgContainerMe]}>
          {!isMe && (
            <View style={styles.msgMeta}>
              <Text style={styles.msgUsername}>{item.users?.username || 'Anonymous'}</Text>
              {isLeader && (
                <View style={[styles.roleBadge, { backgroundColor: item.users?.leader_badge_color || '#6B7280' }]}>
                  <Text style={styles.roleBadgeText}>{item.users?.leader_type || 'Leader'}</Text>
                </View>
              )}
              {isAdmin && (
                <View style={[styles.roleBadge, { backgroundColor: '#FF6B35' }]}>
                  <Text style={styles.roleBadgeText}>Admin</Text>
                </View>
              )}
            </View>
          )}
          <View style={[styles.msgBubble, isMe && styles.msgBubbleMe]}>
            <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{item.message}</Text>
          </View>
          <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>{getTimeAgo(item.created_at)}</Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>💬 World Chat</Text>
          <Text style={styles.headerSub}>Sab ki awaaz, ek jagah</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.limitBadge}>
            <Text style={styles.limitText}>{dailyCount}/5</Text>
          </View>
          <TouchableOpacity style={styles.aiBtn} onPress={getAiSummary} disabled={summaryLoading}>
            {summaryLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.aiBtnText}>🤖 AI</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* AI Summary */}
      {aiSummary ? (
        <View style={styles.aiSummaryBox}>
          <Text style={styles.aiSummaryLabel}>🤖 AI Summary for Leaders</Text>
          <Text style={styles.aiSummaryText}>{aiSummary}</Text>
          <TouchableOpacity onPress={async () => { await playTap(); setAiSummary(''); }}>
            <Text style={styles.aiSummaryClose}>✕ Band Karo</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Rules Banner */}
      <View style={styles.rulesBanner}>
        <Text style={styles.rulesText}>
          📋 Rules: Sirf 5 messages/din • 5 lines max • Gaali nahi • Sirf civic problems
        </Text>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyText}>Koi message nahi hai abhi</Text>
              <Text style={styles.emptySubText}>Pehle message bhejo!</Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder={dailyCount >= 5 ? 'Aaj ki limit ho gayi...' : 'Apni baat likho (5 lines max)...'}
            placeholderTextColor="#475569"
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={300}
            editable={dailyCount < 5}
          />
          <Text style={styles.charCount}>{message.length}/300</Text>
        </View>
        <TouchableOpacity
          style={[styles.sendBtn, (sending || dailyCount >= 5 || !message.trim()) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={sending || dailyCount >= 5 || !message.trim()}
          activeOpacity={0.85}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendBtnText}>📤</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  limitBadge: {
    backgroundColor: '#FF6B3520', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#FF6B3540',
  },
  limitText: { fontSize: 13, color: '#FF6B35', fontWeight: '700' },
  aiBtn: {
    backgroundColor: '#6366F1', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6,
  },
  aiBtnText: { fontSize: 12, color: '#fff', fontWeight: '700' },
  aiSummaryBox: {
    backgroundColor: '#0F172A', margin: 12, borderRadius: 12, padding: 14,
    borderLeftWidth: 4, borderLeftColor: '#6366F1',
  },
  aiSummaryLabel: { fontSize: 11, color: '#818CF8', fontWeight: '700', marginBottom: 6 },
  aiSummaryText: { fontSize: 13, color: '#C7D2FE', lineHeight: 20 },
  aiSummaryClose: { fontSize: 12, color: '#6366F1', marginTop: 8, textAlign: 'right' },
  rulesBanner: {
    backgroundColor: '#FF6B3510', paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#FF6B3520',
  },
  rulesText: { fontSize: 11, color: '#FF6B35', textAlign: 'center' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messagesList: { padding: 16, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  msgRowMe: { flexDirection: 'row-reverse' },
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#334155',
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#F1F5F9' },
  msgContainer: { maxWidth: '75%' },
  msgContainerMe: { alignItems: 'flex-end' },
  msgMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, paddingLeft: 4 },
  msgUsername: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  roleBadgeText: { fontSize: 9, color: '#fff', fontWeight: '700' },
  msgBubble: {
    backgroundColor: '#1E293B', borderRadius: 18, borderBottomLeftRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#334155',
  },
  msgBubbleMe: {
    backgroundColor: '#FF6B35', borderBottomLeftRadius: 18, borderBottomRightRadius: 4,
    borderColor: '#FF6B35',
  },
  msgText: { fontSize: 14, color: '#E2E8F0', lineHeight: 20 },
  msgTextMe: { color: '#fff' },
  msgTime: { fontSize: 10, color: '#475569', marginTop: 3, paddingLeft: 4 },
  msgTimeMe: { paddingLeft: 0, paddingRight: 4 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#64748B' },
  emptySubText: { fontSize: 13, color: '#475569', marginTop: 6 },
  inputContainer: {
    flexDirection: 'row', padding: 12, gap: 10, alignItems: 'flex-end',
    backgroundColor: '#1E293B', borderTopWidth: 1, borderTopColor: '#334155',
  },
  inputWrapper: { flex: 1, position: 'relative' },
  input: {
    backgroundColor: '#0F172A', borderRadius: 20, paddingHorizontal: 16,
    paddingVertical: 10, color: '#F1F5F9', fontSize: 14, maxHeight: 100,
    borderWidth: 1, borderColor: '#334155',
  },
  charCount: {
    position: 'absolute', bottom: 4, right: 12,
    fontSize: 9, color: '#475569',
  },
  sendBtn: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#FF6B35',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#FF6B35', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: 20 },
});
