import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase, getPersonalChat, sendPersonalChat, subscribePersonalChat } from '../../lib/supabase';
import { playTap } from '../../lib/sounds';

export default function PersonalChat() {
  const { userId } = useLocalSearchParams();
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);
  const subscription = useRef(null);

  useEffect(() => {
    init();
    return () => { if (subscription.current) subscription.current.unsubscribe(); };
  }, [userId]);

  const init = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { router.replace('/login'); return; }

    const { data: me } = await supabase.from('users').select('*').eq('id', authUser.id).single();
    const { data: other } = await supabase.from('users').select('*').eq('id', userId).single();

    if (other?.role === 'leader') {
      Alert.alert(
        'Message Nahi Kar Sakte',
        'Leader ko direct message nahi kar sakte. World Chat use karo.',
        [{ text: 'Theek Hai', onPress: () => router.back() }]
      );
      return;
    }

    setCurrentUser(me);
    setOtherUser(other);

    await loadMessages(authUser.id);
    setLoading(false);

    subscription.current = subscribePersonalChat(authUser.id, async (payload) => {
      if (payload.new.sender_id === userId) {
        const { data } = await supabase
          .from('personal_chats')
          .select(`
            *,
            sender:users!personal_chats_sender_id_fkey(id, username, avatar_url),
            receiver:users!personal_chats_receiver_id_fkey(id, username, avatar_url)
          `)
          .eq('id', payload.new.id)
          .single();
        if (data) setMessages(prev => [...prev, data]);
      }
    });
  };

  const loadMessages = async (myId) => {
    const { data } = await getPersonalChat(myId, userId);
    setMessages(data || []);
  };

  const handleSend = async () => {
    await playTap();
    if (!message.trim() || !currentUser) return;
    setSending(true);
    const { data, error } = await sendPersonalChat(currentUser.id, userId, message.trim());
    if (error) {
      Alert.alert('Error', error.message || 'Message nahi gaya.');
    } else {
      setMessages(prev => [...prev, data]);
      setMessage('');
      flatListRef.current?.scrollToEnd({ animated: true });
    }
    setSending(false);
  };

  const getTimeAgo = (d) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h pehle`;
    if (m > 0) return `${m}m pehle`;
    return 'Abhi';
  };

  const renderMessage = ({ item }) => {
    const isMe = item.sender_id === currentUser?.id;
    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        <View style={[styles.bubble, isMe && styles.bubbleMe]}>
          <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.message}</Text>
          <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>{getTimeAgo(item.created_at)}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={async () => { await playTap(); router.back(); }}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerUser}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {otherUser?.name?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <View>
            <Text style={styles.headerName}>{otherUser?.name || 'User'}</Text>
            <Text style={styles.headerHandle}>@{otherUser?.username}</Text>
          </View>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyText}>Pehla message bhejo!</Text>
          </View>
        }
      />

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
          onPress={handleSend}
          disabled={!message.trim() || sending}
        >
          {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendIcon}>📤</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  loadingContainer: { flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  backBtn: { fontSize: 22, color: '#FF6B35', fontWeight: '700' },
  headerUser: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#334155',
    alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarText: { fontSize: 18, fontWeight: '700', color: '#F1F5F9' },
  headerName: { fontSize: 16, fontWeight: '700', color: '#F1F5F9' },
  headerHandle: { fontSize: 12, color: '#64748B' },
  messagesList: { padding: 16, paddingBottom: 8 },
  msgRow: { marginBottom: 10, alignItems: 'flex-start' },
  msgRowMe: { alignItems: 'flex-end' },
  bubble: {
    backgroundColor: '#1E293B', borderRadius: 18, borderBottomLeftRadius: 4,
    paddingHorizontal: 16, paddingVertical: 10, maxWidth: '78%',
    borderWidth: 1, borderColor: '#334155',
  },
  bubbleMe: {
    backgroundColor: '#FF6B35', borderBottomLeftRadius: 18, borderBottomRightRadius: 4,
    borderColor: '#FF6B35',
  },
  bubbleText: { fontSize: 15, color: '#E2E8F0', lineHeight: 22 },
  bubbleTextMe: { color: '#fff' },
  bubbleTime: { fontSize: 10, color: '#475569', marginTop: 4 },
  bubbleTimeMe: { color: '#FFD4C2' },
  emptyContainer: { alignItems: 'center', paddingTop: 100 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#64748B' },
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
