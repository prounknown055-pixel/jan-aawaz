import {
  View, Text, StyleSheet, TouchableOpacity, Animated
} from 'react-native';
import { useRef } from 'react';
import { useRouter } from 'expo-router';
import { playTap } from '../lib/sounds';

export default function LeaderCard({ leader, compact = false }) {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = async () => {
    await playTap();
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    router.push(`/leader/${leader.id}`);
  };

  if (compact) {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity style={styles.compactCard} onPress={handlePress} activeOpacity={1}>
          <View style={[styles.compactAvatar, { borderColor: leader.leader_badge_color || '#6B7280' }]}>
            <Text style={styles.compactAvatarText}>{leader.name?.[0]?.toUpperCase() || '?'}</Text>
          </View>
          <View style={[styles.compactBadge, { backgroundColor: leader.leader_badge_color || '#6B7280' }]}>
            <Text style={styles.compactBadgeText}>{leader.leader_type || 'Leader'}</Text>
          </View>
          <Text style={styles.compactName} numberOfLines={1}>{leader.name}</Text>
          <Text style={styles.compactArea} numberOfLines={1}>{leader.leader_area}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={1}>
        <View style={styles.cardLeft}>
          <View style={[styles.avatar, { borderColor: leader.leader_badge_color || '#6B7280' }]}>
            <Text style={styles.avatarText}>{leader.name?.[0]?.toUpperCase() || '?'}</Text>
            {leader.leader_verified && (
              <View style={styles.verifiedDot}>
                <Text style={styles.verifiedDotText}>✓</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{leader.name}</Text>
            <View style={[styles.typeBadge, { backgroundColor: leader.leader_badge_color || '#6B7280' }]}>
              <Text style={styles.typeBadgeText}>{leader.leader_type}</Text>
            </View>
          </View>
          <Text style={styles.handle}>@{leader.username}</Text>
          <Text style={styles.area} numberOfLines={1}>
            📍 {[leader.leader_area, leader.leader_district, leader.leader_state].filter(Boolean).join(', ')}
          </Text>

          <View style={styles.statsRow}>
            <Text style={styles.stat}>👥 {leader.follower_count || 0}</Text>
            <Text style={styles.stat}>⭐ {leader.popularity_score || 0}</Text>
            {leader.total_cases_filed > 0 && (
              <Text style={[styles.stat, { color: '#EF4444' }]}>⚖️ {leader.total_cases_filed}</Text>
            )}
          </View>
        </View>

        <Text style={styles.arrow}>→</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E293B', borderRadius: 16, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#334155',
    flexDirection: 'row', alignItems: 'center',
  },
  cardLeft: { marginRight: 12 },
  avatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#0F172A',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2,
    position: 'relative',
  },
  avatarText: { fontSize: 22, fontWeight: '900', color: '#F1F5F9' },
  verifiedDot: {
    position: 'absolute', bottom: -2, right: -2,
    backgroundColor: '#10B981', width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#1E293B',
  },
  verifiedDotText: { fontSize: 9, color: '#fff', fontWeight: '900' },
  cardContent: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  name: { fontSize: 15, fontWeight: '800', color: '#F1F5F9' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  typeBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  handle: { fontSize: 12, color: '#64748B', marginBottom: 2 },
  area: { fontSize: 12, color: '#94A3B8', marginBottom: 6 },
  statsRow: { flexDirection: 'row', gap: 12 },
  stat: { fontSize: 12, color: '#64748B' },
  arrow: { fontSize: 16, color: '#334155' },
  compactCard: {
    backgroundColor: '#1E293B', borderRadius: 14, padding: 12,
    marginRight: 10, width: 100, alignItems: 'center',
    borderWidth: 1, borderColor: '#334155',
  },
  compactAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#0F172A',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, marginBottom: 6,
  },
  compactAvatarText: { fontSize: 20, fontWeight: '700', color: '#F1F5F9' },
  compactBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginBottom: 4 },
  compactBadgeText: { fontSize: 9, color: '#fff', fontWeight: '700' },
  compactName: { fontSize: 11, fontWeight: '700', color: '#F1F5F9', textAlign: 'center' },
  compactArea: { fontSize: 10, color: '#64748B', textAlign: 'center', marginTop: 2 },
});
