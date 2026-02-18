import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { playTap } from '../lib/sounds';

export default function ChatBubble({ message, isMe, showUsername = true }) {
  const router = useRouter();
  const isLeader = message.users?.role === 'leader';
  const isAdmin = message.users?.role === 'admin';

  return (
    <View style={[styles.container, isMe && styles.containerMe]}>
      {!isMe && showUsername && (
        <TouchableOpacity
          style={[
            styles.avatar,
            isLeader && { borderColor: message.users?.leader_badge_color || '#FF6B35', borderWidth: 2 },
            isAdmin && { borderColor: '#FF6B35', borderWidth: 2 },
          ]}
          onPress={async () => {
            await playTap();
            if (isLeader) router.push(`/leader/${message.user_id}`);
            else router.push(`/chat/${message.user_id}`);
          }}
        >
          <Text style={styles.avatarText}>
            {message.users?.username?.[0]?.toUpperCase() || '?'}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.bubbleWrapper}>
        {!isMe && showUsername && (
          <View style={styles.metaRow}>
            <TouchableOpacity
              onPress={async () => {
                await playTap();
                if (isLeader) router.push(`/leader/${message.user_id}`);
              }}
            >
              <Text style={[styles.username, isLeader && { color: message.users?.leader_badge_color || '#FF6B35' }]}>
                @{message.users?.username || 'Anonymous'}
              </Text>
            </TouchableOpacity>
            {isLeader && (
              <View style={[styles.roleBadge, { backgroundColor: message.users?.leader_badge_color || '#6B7280' }]}>
                <Text style={styles.roleBadgeText}>{message.users?.leader_type || 'Leader'}</Text>
              </View>
            )}
            {isAdmin && (
              <View style={[styles.roleBadge, { backgroundColor: '#FF6B35' }]}>
                <Text style={styles.roleBadgeText}>Admin</Text>
              </View>
            )}
          </View>
        )}

        <View style={[styles.bubble, isMe && styles.bubbleMe]}>
          <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
            {message.message}
          </Text>
        </View>

        <Text style={[styles.timeText, isMe && styles.timeTextMe]}>
          {getTimeAgo(message.created_at)}
        </Text>
      </View>
    </View>
  );
}

const getTimeAgo = (d) => {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return 'Abhi';
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  containerMe: { flexDirection: 'row-reverse' },
  avatar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#334155',
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#F1F5F9' },
  bubbleWrapper: { maxWidth: '75%' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3, paddingLeft: 4 },
  username: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  roleBadgeText: { fontSize: 9, color: '#fff', fontWeight: '700' },
  bubble: {
    backgroundColor: '#1E293B', borderRadius: 16, borderBottomLeftRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#334155',
  },
  bubbleMe: {
    backgroundColor: '#FF6B35', borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4, borderColor: '#FF6B35',
  },
  messageText: { fontSize: 14, color: '#E2E8F0', lineHeight: 20 },
  messageTextMe: { color: '#fff' },
  timeText: { fontSize: 10, color: '#475569', marginTop: 3, paddingLeft: 4 },
  timeTextMe: { textAlign: 'right', paddingLeft: 0, paddingRight: 4 },
});
